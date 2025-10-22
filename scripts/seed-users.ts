import axios from 'axios';
import { User } from '../src/users/entities/user.entity.js';

const API_URL = 'http://localhost:3000/users';
const TOTAL_USERS = 10000;
const BATCH_SIZE = 100; // Create 100 users at a time
const CONCURRENT_BATCHES = 10; // Run 10 batches in parallel

async function createUser(index: number): Promise<User | null> {
  try {
    const response = await axios.post(API_URL, {
      email: `user${index}@example.com`,
      username: `user${index}`,
      fullName: `Test User ${index}`,
    });
    return response.data as User;
  } catch (error) {
    console.error(`Failed to create user ${index}:`, error.message);
    return null;
  }
}

async function createBatch(
  startIndex: number,
  batchSize: number,
): Promise<Array<User | null>> {
  const promises: Array<User | null> = [];
  for (let i = startIndex; i < startIndex + batchSize; i++) {
    const user = await createUser(i);
    if (user) {
      promises.push(user);
    }
  }
  return promises;
}

async function seedUsers() {
  console.log(`🌱 Starting to seed ${TOTAL_USERS} users...`);
  console.log(`📊 Batch size: ${BATCH_SIZE}`);
  console.log(`⚡ Concurrent batches: ${CONCURRENT_BATCHES}`);

  const startTime = Date.now();
  let createdCount = 0;

  for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE * CONCURRENT_BATCHES) {
    const batchPromises: Array<Promise<Array<User | null>>> = [];

    // Create multiple batches in parallel
    for (let j = 0; j < CONCURRENT_BATCHES; j++) {
      const batchStart = i + j * BATCH_SIZE;
      if (batchStart < TOTAL_USERS) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_USERS);
        const actualBatchSize = batchEnd - batchStart;
        batchPromises.push(createBatch(batchStart, actualBatchSize));
      }
    }

    const results = await Promise.all(batchPromises);
    const successCount = results.flat().filter((r) => r !== null).length;
    createdCount += successCount;

    const progress = ((createdCount / TOTAL_USERS) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = ((createdCount / (Date.now() - startTime)) * 1000).toFixed(0);

    console.log(
      `📈 Progress: ${progress}% (${createdCount}/${TOTAL_USERS}) | ` +
        `Time: ${elapsed}s | Rate: ${rate} users/sec`,
    );
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgRate = ((TOTAL_USERS / (Date.now() - startTime)) * 1000).toFixed(0);

  console.log('');
  console.log('✅ Seeding completed!');
  console.log(`📊 Total users created: ${createdCount}`);
  console.log(`⏱️  Total time: ${totalTime}s`);
  console.log(`⚡ Average rate: ${avgRate} users/sec`);

  // Check distribution
  console.log('');
  console.log('📊 Checking shard distribution...');

  try {
    const statsResponse: any = await axios.get(`${API_URL}/stats/distribution`);
    console.log('');
    console.log('Shard Distribution:');
    statsResponse.data.forEach((shard: any) => {
      const percentage = ((shard.userCount / createdCount) * 100).toFixed(2);
      console.log(
        `  Shard ${shard.shardId}: ${shard.userCount.toLocaleString()} users (${percentage}%)`,
      );
    });

    // Check if distribution is even (within 5%)
    const counts = statsResponse.data.map((s: any) => s.userCount);
    const avg = counts.reduce((a: number, b: number) => a + b) / counts.length;
    const maxDeviation = Math.max(
      ...counts.map((c: number) => (Math.abs(c - avg) / avg) * 100),
    );

    console.log('');
    if (maxDeviation <= 5) {
      console.log(
        `✅ Distribution is even (max deviation: ${maxDeviation.toFixed(2)}%)`,
      );
    } else {
      console.log(
        `⚠️  Distribution uneven (max deviation: ${maxDeviation.toFixed(2)}%)`,
      );
    }
  } catch (error) {
    console.error('Failed to get stats:', error.message);
  }
}

// Run
seedUsers()
  .then(() => {
    console.log('');
    console.log('🎉 Done! Ready for load testing.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
