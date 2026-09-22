const { Sequelize } = require('sequelize');
const s = new Sequelize('JKFutureDB', 'postgres', 'doorstep', { host: 'localhost', port: 5432, dialect: 'postgres', logging: false });

async function check() {
  try {
    const [results] = await s.query('SELECT id, title, length("cellChecklists") as len, "updatedAt" FROM daily_agenda_matrices');
    console.log('Matrices in DB:', JSON.stringify(results, null, 2));
    const [rows] = await s.query('SELECT "cellChecklists" FROM daily_agenda_matrices LIMIT 1');
    if (rows && rows[0]) {
      const keys = Object.keys(JSON.parse(rows[0].cellChecklists || '{}'));
      console.log('CellChecklists keys in DB:', keys);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await s.close();
  }
}
check();
