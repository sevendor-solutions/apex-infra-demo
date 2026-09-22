const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');
const s = new Sequelize('JKFutureDB', 'postgres', 'doorstep', { host: 'localhost', port: 5432, dialect: 'postgres', logging: false });

async function checkUsers() {
  try {
    const [users] = await s.query('SELECT id, username, role, "isActive" FROM users LIMIT 5');
    console.log('Users in DB:', users);
  } catch (e) {
    console.error(e);
  } finally {
    await s.close();
  }
}
checkUsers();
