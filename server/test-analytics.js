// Using global fetch

const API_URL = 'https://zetimer-ctgw.onrender.com/api';
const SCHOOL_ID = 'main-school'; // Assuming this exists or the server defaults to it

async function testAnalytics() {
  const headers = {
    'Content-Type': 'application/json',
    'x-school-id': SCHOOL_ID
  };

  try {
    console.log('Testing /api/students...');
    const studentsRes = await fetch(`${API_URL}/students`, { headers });
    console.log('Students status:', studentsRes.status);

    console.log('Testing /attendance-analytics/summary...');
    const summaryRes = await fetch(`${API_URL}/attendance-analytics/summary`, { headers });
    if (!summaryRes.ok) {
      console.log('Summary failed:', summaryRes.status, await summaryRes.text());
    } else {
      const summary = await summaryRes.json();
      console.log('Summary:', JSON.stringify(summary, null, 2));
    }

    console.log('\nTesting /attendance-analytics/grade-stats...');
    const gradeStatsRes = await fetch(`${API_URL}/attendance-analytics/grade-stats`, { headers });
    if (!gradeStatsRes.ok) {
        console.log('Grade stats failed:', gradeStatsRes.status, await gradeStatsRes.text());
    } else {
        const gradeStats = await gradeStatsRes.json();
        console.log('Grade Stats count:', gradeStats.data.length);
    }

    console.log('\nTesting /attendance-analytics/trends...');
    const trendsRes = await fetch(`${API_URL}/attendance-analytics/trends`, { headers });
    if (!trendsRes.ok) {
        console.log('Trends failed:', trendsRes.status, await trendsRes.text());
    } else {
        const trends = await trendsRes.json();
        console.log('Trends count:', trends.data.length);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAnalytics();
