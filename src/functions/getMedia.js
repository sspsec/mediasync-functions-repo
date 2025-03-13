const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

app.http('getMedia', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'media/{id}',
  handler: async (request, context) => {
    try {
      const id = request.params.id;
      if (!id) throw new Error('请提供媒体ID');

      const cosmosEndpoint = "https://mediasync-cosmos.documents.azure.com:443/";
      const cosmosKey = "GxQeRE2gEjvlBXgxF7YSUl3teAS68PfuWnmdypADSKTmpQpwjT0qKrUdNmh5P9CjacIYjg9g3VnDACDbgaVGgg==";
      const cosmosClient = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
      const database = cosmosClient.database('MediaDB');
      const container = database.container('MediaItems');
      const partitionKey = 'user123'; // 固定分区键，与上传时一致
      const { resource } = await container.item(id, partitionKey).read();

      if (!resource) throw new Error('未找到该媒体文件');

      return {
        body: JSON.stringify(resource),
        headers: { 'Content-Type': 'application/json' }
      };
    } catch (error) {
      return {
        status: 500,
        body: JSON.stringify({ message: '检索失败：' + error.message }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  }
});