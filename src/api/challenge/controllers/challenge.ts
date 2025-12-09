/**
 * challenge controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::challenge.challenge', ({ strapi }) => ({
  /**
   * Find challenges with user submission status
   * - Adds hasUserSubmitted field for authenticated users to each challenge
   * - Includes userSubmission details if exists
   */
  async find(ctx) {
    const userId = ctx.state.user?.id;

    try {
      // Call the default controller action
      const { data, meta } = await super.find(ctx);

      if (!data || data.length === 0) {
        return ctx.send({ data, meta });
      }

      // If user is authenticated, check for their submissions
      if (userId) {
        // Get all challenge IDs from the response
        const challengeDocumentIds = data.map((challenge: any) => challenge.documentId);

        // Query for user's projects for these challenges
        const userProjects: any = await strapi.documents('api::project.project').findMany({
          filters: {
            challenge: {
              documentId: {
                $in: challengeDocumentIds,
              },
            },
            author: {
              id: userId,
            },
          },
          populate: ['challenge'],
          sort: { submittedToChallengeAt: 'desc' },
        });

        // Create a map of challenge -> user's project
        const projectMap = new Map();
        userProjects.forEach((project: any) => {
          if (project.challenge?.documentId && !projectMap.has(project.challenge.documentId)) {
            projectMap.set(project.challenge.documentId, project);
          }
        });

        // Add hasUserSubmitted and userSubmission to each challenge
        const enrichedData = data.map((challenge: any) => {
          const userProject = projectMap.get(challenge.documentId);

          if (userProject) {
            return {
              ...challenge,
              hasUserSubmitted: true,
              userSubmission: {
                id: userProject.id,
                documentId: userProject.documentId,
                name: userProject.name,
                submittedAt: userProject.submittedToChallengeAt,
                isPublic: userProject.isPublic,
              },
            };
          }

          return {
            ...challenge,
            hasUserSubmitted: false,
          };
        });

        return ctx.send({ data: enrichedData, meta });
      }

      // No user authenticated, add hasUserSubmitted: false to all
      const enrichedData = data.map((challenge: any) => ({
        ...challenge,
        hasUserSubmitted: false,
      }));

      return ctx.send({ data: enrichedData, meta });
    } catch (error) {
      strapi.log.error('Error in find challenges:', error);
      return ctx.internalServerError('Error fetching challenges');
    }
  },

  /**
   * Find one challenge with user submission status
   * - Adds hasUserSubmitted field for authenticated users
   * - Includes userSubmission details if exists
   */
  async findOne(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state.user?.id;

    try {
      // Call the default controller action
      const { data, meta } = await super.findOne(ctx);

      if (!data) {
        return ctx.notFound('Challenge not found');
      }

      // If user is authenticated, check for their submission
      if (userId) {
        // Query for user's projects for this challenge
        const userProjects: any = await strapi.documents('api::project.project').findMany({
          filters: {
            challenge: {
              documentId: id,
            },
            author: {
              id: userId,
            },
          },
          sort: { submittedToChallengeAt: 'desc' },
          limit: 1,
        });

        if (userProjects.length > 0) {
          const userProject = userProjects[0];

          return ctx.send({
            data: {
              ...data,
              hasUserSubmitted: true,
              userSubmission: {
                id: userProject.id,
                documentId: userProject.documentId,
                name: userProject.name,
                submittedAt: userProject.submittedToChallengeAt,
                isPublic: userProject.isPublic,
              },
            },
            meta,
          });
        }
      }

      // No submission found or user not authenticated
      return ctx.send({
        data: {
          ...data,
          hasUserSubmitted: false,
        },
        meta,
      });
    } catch (error) {
      strapi.log.error('Error in findOne challenge:', error);
      return ctx.internalServerError('Error fetching challenge');
    }
  },

  /**
   * Start voting period for a challenge
   * - Updates challenge status to 'voting'
   * - Makes all submissions public
   * - Resets votesReceived and votedBy for all submissions
   */
  async startVoting(ctx) {
    const { id } = ctx.params;

    try {
      // Get the challenge
      const challenge: any = await strapi.documents('api::challenge.challenge').findOne({
        documentId: id,
        populate: ['projects'],
      });

      if (!challenge) {
        return ctx.notFound('Challenge not found');
      }

      // Check if voting start date has arrived
      const now = new Date();
      const votingStartDate = challenge.votingStartDate ? new Date(challenge.votingStartDate) : null;

      if (votingStartDate && now < votingStartDate) {
        return ctx.badRequest(`Voting period has not started yet. Starts on: ${votingStartDate.toISOString()}`);
      }

      // Check if challenge is in correct state
      if (challenge.currentStatus === 'voting') {
        return ctx.badRequest('Challenge is already in voting period');
      }

      if (challenge.currentStatus === 'completed' || challenge.currentStatus === 'archived') {
        return ctx.badRequest(`Cannot start voting for a ${challenge.currentStatus} challenge`);
      }

      // Update challenge status
      await strapi.documents('api::challenge.challenge').update({
        documentId: id,
        data: {
          currentStatus: 'voting',
        } as any,
      });

      // Update all submissions: make public, reset votes
      if (challenge.projects && challenge.projects.length > 0) {
        for (const project of challenge.projects) {
          await strapi.documents('api::project.project').update({
            documentId: project.documentId,
            data: {
              isPublic: true,
              votesReceived: 0,
              votedBy: {
                set: [], // Clear all voters
              } as any,
            },
          });

          // Publish the project
          await strapi.documents('api::project.project').publish({
            documentId: project.documentId,
          });
        }
      }

      // Publish the challenge update
      await strapi.documents('api::challenge.challenge').publish({
        documentId: id,
      });

      return ctx.send({
        message: 'Voting period started successfully',
        challenge: {
          id: challenge.id,
          documentId: challenge.documentId,
          title: challenge.title,
          currentStatus: 'voting',
          submissionCount: challenge.projects?.length || 0,
        },
      });
    } catch (error) {
      strapi.log.error('Error in startVoting:', error);
      return ctx.internalServerError('Error starting voting period');
    }
  },

  /**
   * End voting period for a challenge
   * - Updates challenge status to 'completed'
   * - Determines top 3 winners by votesReceived
   * - Awards bonus XP to winners
   * - Updates profile.challengesWon for winners
   */
  async endVoting(ctx) {
    const { id } = ctx.params;

    try {
      // Get the challenge with projects
      const challenge: any = await strapi.documents('api::challenge.challenge').findOne({
        documentId: id,
        populate: ['projects', 'projects.author', 'projects.author.profile'],
      });

      if (!challenge) {
        return ctx.notFound('Challenge not found');
      }

      // Check if voting end date has arrived
      const now = new Date();
      const votingEndDate = challenge.votingEndDate ? new Date(challenge.votingEndDate) : null;

      if (votingEndDate && now < votingEndDate) {
        return ctx.badRequest(`Voting period has not ended yet. Ends on: ${votingEndDate.toISOString()}`);
      }

      // Check if challenge is in voting status
      if (challenge.currentStatus !== 'voting') {
        return ctx.badRequest(`Challenge must be in 'voting' status to end voting. Current status: ${challenge.currentStatus}`);
      }

      // Get all projects with votes, sorted by votesReceived
      const projectsWithVotes = challenge.projects || [];

      // Fetch full project details to get votesReceived
      const fullProjects = await Promise.all(
        projectsWithVotes.map((p: any) =>
          strapi.documents('api::project.project').findOne({
            documentId: p.documentId,
            populate: ['author', 'profile'],
          })
        )
      );

      // Sort by votesReceived (descending)
      const sortedProjects = fullProjects
        .filter((p) => p !== null)
        .sort((a: any, b: any) => (b.votesReceived || 0) - (a.votesReceived || 0));

      // Get top 3 winners
      const winners = sortedProjects.slice(0, 3);
      const winnerIds = winners.map((w: any) => w.id);

      // XP rewards for winners
      const xpRewards = [200, 100, 50]; // 1st, 2nd, 3rd place

      // Award XP to winners and update challengesWon
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        const xpBonus = xpRewards[i];
        const authorId = winner.author?.id || winner.profile?.user?.id;

        if (authorId) {
          // Find the profile
          const profiles: any = await strapi.documents('api::profile.profile').findMany({
            filters: {
              user: {
                id: authorId,
              },
            },
          });

          if (profiles.length > 0) {
            const profile = profiles[0];
            await strapi.documents('api::profile.profile').update({
              documentId: profile.documentId,
              data: {
                totalXP: (profile.totalXP || 0) + xpBonus,
                challengesWon: (profile.challengesWon || 0) + 1,
              },
            });

            // Publish profile changes
            await strapi.documents('api::profile.profile').publish({
              documentId: profile.documentId,
            });
          }
        }
      }

      // Update challenge with winners and completed status
      await strapi.documents('api::challenge.challenge').update({
        documentId: id,
        data: {
          currentStatus: 'completed',
          winners: {
            set: winnerIds,
          } as any,
        } as any,
      });

      // Publish the challenge update
      await strapi.documents('api::challenge.challenge').publish({
        documentId: id,
      });

      return ctx.send({
        message: 'Voting period ended successfully',
        challenge: {
          id: challenge.id,
          documentId: challenge.documentId,
          title: challenge.title,
          currentStatus: 'completed',
        },
        winners: winners.map((w: any, index: number) => ({
          position: index + 1,
          projectId: w.id,
          projectName: w.name,
          votesReceived: w.votesReceived || 0,
          xpAwarded: xpRewards[index],
          author: w.author?.username || 'Unknown',
        })),
      });
    } catch (error) {
      strapi.log.error('Error in endVoting:', error);
      return ctx.internalServerError('Error ending voting period');
    }
  },

  /**
   * Submit a project to a challenge
   * - Creates or updates a project
   * - Sets status based on challenge state
   * - Awards XP for first submission
   */
  async submitProject(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state.user?.id;
    const { name, htmlCode, cssCode, jsCode, projectId } = ctx.request.body as any;

    if (!userId) {
      return ctx.unauthorized('You must be authenticated to submit');
    }

    if (!name || !htmlCode) {
      return ctx.badRequest('Project name and HTML code are required');
    }

    try {
      // Get the challenge
      const challenge: any = await strapi.documents('api::challenge.challenge').findOne({
        documentId: id,
        populate: ['profiles'],
      });

      if (!challenge) {
        return ctx.notFound('Challenge not found');
      }

      // Check if challenge is accepting submissions
      if (challenge.currentStatus === 'completed' || challenge.currentStatus === 'archived') {
        return ctx.badRequest(`Challenge is ${challenge.currentStatus} and not accepting submissions`);
      }

      // Determine project visibility based on challenge state
      // Before voting: private, During voting: public
      let isPublic = false;

      if (challenge.currentStatus === 'voting') {
        isPublic = true;
      }

      // Get user's profile
      const profiles: any = await strapi.documents('api::profile.profile').findMany({
        filters: {
          user: {
            id: userId,
          },
        },
      });

      const userProfile = profiles.length > 0 ? profiles[0] : null;

      let project: any;

      // Update existing project or create new one
      if (projectId) {
        // Update existing project
        const existingProject: any = await strapi.documents('api::project.project').findOne({
          documentId: projectId,
          populate: ['author'],
        });

        if (!existingProject) {
          return ctx.notFound('Project not found');
        }

        // Check ownership
        if (existingProject.author?.id !== userId) {
          return ctx.forbidden('You can only update your own projects');
        }

        project = await strapi.documents('api::project.project').update({
          documentId: projectId,
          data: {
            name,
            htmlCode,
            cssCode,
            jsCode,
            challenge: challenge.id,
            isPublic,
            submittedToChallengeAt: new Date(),
          },
        });
      } else {
        // Create new project
        project = await strapi.documents('api::project.project').create({
          data: {
            name,
            htmlCode,
            cssCode: cssCode || '',
            jsCode: jsCode || '',
            author: userId,
            profile: userProfile?.id,
            challenge: challenge.id,
            isPublic,
            submittedToChallengeAt: new Date(),
            votesReceived: 0,
          },
        });
      }

      // Publish the project
      await strapi.documents('api::project.project').publish({
        documentId: project.documentId,
      });

      // Check if this is user's first submission to this challenge
      const hasCompletedBefore = challenge.profiles?.some((p: any) => p.user?.id === userId || p.id === userProfile?.id);

      if (!hasCompletedBefore && userProfile) {
        // Award XP for completing the challenge
        const xpReward = challenge.xpReward || 50;

        await strapi.documents('api::profile.profile').update({
          documentId: userProfile.documentId,
          data: {
            totalXP: (userProfile.totalXP || 0) + xpReward,
            challengesCompleted: (userProfile.challengesCompleted || 0) + 1,
            completedChallenges: {
              connect: [challenge.id],
            } as any,
          },
        });

        // Publish profile update
        await strapi.documents('api::profile.profile').publish({
          documentId: userProfile.documentId,
        });

        // Increment challenge submission count
        await strapi.documents('api::challenge.challenge').update({
          documentId: id,
          data: {
            submissionCount: (challenge.submissionCount || 0) + 1,
          } as any,
        });

        // Publish challenge update
        await strapi.documents('api::challenge.challenge').publish({
          documentId: id,
        });
      }

      return ctx.send({
        message: 'Project submitted successfully',
        project: {
          id: project.id,
          documentId: project.documentId,
          name: project.name,
          isPublic: project.isPublic,
        },
        xpAwarded: !hasCompletedBefore ? (challenge.xpReward || 50) : 0,
      });
    } catch (error) {
      strapi.log.error('Error in submitProject:', error);
      return ctx.internalServerError('Error submitting project');
    }
  },
}));
