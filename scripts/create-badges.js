'use strict';

/**
 * Script to create the three required badges for the gamification system
 * Run with: node scripts/create-badges.js
 */

const badges = [
  {
    name: 'First Project',
    slug: 'first-project',
    description: 'Created your very first project! This is just the beginning of your coding journey.',
    icon: '🎯',
    requirement: 'Create your first project',
    category: 'milestone',
    rarity: 'common',
  },
  {
    name: 'First Challenge Submit',
    slug: 'first-challenge-submit',
    description: 'Completed your first challenge submission! You\'re taking your skills to the next level.',
    icon: '🏆',
    requirement: 'Submit to your first challenge',
    category: 'milestone',
    rarity: 'common',
  },
  {
    name: 'Junior Star',
    slug: 'junior-star',
    description: 'One of your projects reached 3 likes from the community! People are noticing your work.',
    icon: '⭐',
    requirement: 'Get 3 likes on any project',
    category: 'social',
    rarity: 'rare',
  },
];

async function createBadges() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  console.log('🚀 Starting Strapi...');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'error';

  try {
    console.log('📛 Creating badges...\n');

    for (const badgeData of badges) {
      try {
        // Check if badge already exists (check both draft and published)
        const existingBadges = await app.documents('api::badge.badge').findMany({
          filters: {
            slug: badgeData.slug,
          },
        });

        if (existingBadges && existingBadges.length > 0) {
          const badge = existingBadges[0];

          // Check if it's published
          const publishedBadges = await app.documents('api::badge.badge').findMany({
            filters: {
              slug: badgeData.slug,
            },
            status: 'published',
          });

          if (!publishedBadges || publishedBadges.length === 0) {
            // Badge exists but not published, publish it
            await app.documents('api::badge.badge').publish({
              documentId: badge.documentId,
            });
            console.log(`📤 Published existing badge: ${badgeData.icon} ${badgeData.name}`);
          } else {
            console.log(`✅ Badge "${badgeData.name}" already exists and is published`);
          }
          continue;
        }

        // Create the badge
        const badge = await app.documents('api::badge.badge').create({
          data: badgeData,
        });

        // Publish the badge
        await app.documents('api::badge.badge').publish({
          documentId: badge.documentId,
        });

        console.log(`✅ Created and published: ${badgeData.icon} ${badgeData.name}`);
      } catch (error) {
        console.error(`❌ Error creating badge "${badgeData.name}":`, error.message);
      }
    }

    console.log('\n🎉 Badges setup complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

createBadges().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
