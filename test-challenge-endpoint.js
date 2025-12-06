/**
 * Script de prueba para el endpoint de proyectos por challenge
 * Ejecutar: node test-challenge-endpoint.js
 */

const API_URL = 'http://localhost:1337/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywiaWF0IjoxNzY1MDE4MDA0LCJleHAiOjE3Njc2MTAwMDR9.ytxw-jKIKstf-Cx3k7_a9U4ld1119MEb9DEqiAgibUo';

async function testChallengeEndpoint() {
  console.log('🧪 Probando endpoint: /api/projects/challenge/:challengeId\n');

  // Challenge IDs disponibles
  const challengeIds = [
    'zjaggzncqamddaztnm27b2vk', // Advanced Skeleton Loading Screen
    'zagf175dnum6nxoytaw2drcj'  // Glassmorphism Card Effect (tiene 4 proyectos)
  ];

  for (const challengeId of challengeIds) {
    console.log(`\n📦 Testing Challenge ID: ${challengeId}`);
    console.log('='.repeat(60));

    try {
      // Test 1: Sin autenticación
      console.log('\n1️⃣ Sin autenticación:');
      const url1 = `${API_URL}/projects/challenge/${challengeId}?sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=10`;
      const response1 = await fetch(url1);
      const data1 = await response1.json();

      console.log(`   Status: ${response1.status}`);
      console.log(`   Proyectos encontrados: ${data1.data?.length || 0}`);
      console.log(`   Total: ${data1.meta?.pagination?.total || 0}`);
      if (data1.meta?.challenge) {
        console.log(`   Challenge: ${data1.meta.challenge.title}`);
      }

      // Test 2: Con autenticación
      console.log('\n2️⃣ Con autenticación:');
      const url2 = `${API_URL}/projects/challenge/${challengeId}?sort=likes:desc`;
      const response2 = await fetch(url2, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      });
      const data2 = await response2.json();

      console.log(`   Status: ${response2.status}`);
      console.log(`   Proyectos encontrados: ${data2.data?.length || 0}`);
      if (data2.data && data2.data.length > 0) {
        console.log(`   Primer proyecto tiene 'hasLiked': ${data2.data[0].hasLiked !== undefined ? '✅' : '❌'}`);
      }

      // Test 3: Ordenamiento por popularidad
      console.log('\n3️⃣ Ordenado por likes (más popular):');
      const url3 = `${API_URL}/projects/challenge/${challengeId}?sort=likes:desc`;
      const response3 = await fetch(url3);
      const data3 = await response3.json();

      if (data3.data && data3.data.length > 0) {
        console.log(`   Primer proyecto: ${data3.data[0].name} (${data3.data[0].likes} likes)`);
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Test 4: Challenge inexistente
  console.log('\n\n📦 Testing Challenge inexistente');
  console.log('='.repeat(60));
  try {
    const response = await fetch(`${API_URL}/projects/challenge/invalid-id`);
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Mensaje: ${data.error?.message || 'OK'}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }

  console.log('\n\n✅ Pruebas completadas!\n');
}

// Ejecutar pruebas
testChallengeEndpoint().catch(console.error);
