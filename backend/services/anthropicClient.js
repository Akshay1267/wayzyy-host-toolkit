const aiClient = require('./aiClient');

module.exports = {
  getClient: aiClient.getActiveClients,
  testConnection: aiClient.testConnection,
  chat: aiClient.chat,
  chatWithHistory: aiClient.chatWithHistory
};
