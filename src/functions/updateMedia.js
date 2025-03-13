const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('updateMedia', {
  methods: ['PUT'],
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
      const partitionKey = 'user123'; // 固定分区键值
      const { resource } = await container.item(id, partitionKey).read();

      if (!resource) throw new Error('未找到该媒体文件');

      const storageConnectionString = "DefaultEndpointsProtocol=https;AccountName=mediasyncstorage;AccountKey=ZqFyaBFzEKA7OWOF0F0IU2PxbwWopX1NnAQ08b9MKWG2L/OcWX9Hv9NIkTKw3GAINnk66lPIlkrZ+AStV8eSdw==;EndpointSuffix=core.windows.net";
      const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
      const containerClient = blobServiceClient.getContainerClient('media-files');
      let blobUrl = resource.blobUrl;
      const formData = await request.formData();
      const file = formData.get('file');
      if (file) {
        const blockBlobClient = containerClient.getBlockBlobClient(id);
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await blockBlobClient.uploadData(fileBuffer);
        blobUrl = blockBlobClient.url;
      }

      const updatedItem = {
        id: id,
        userId: resource.userId,
        fileName: formData.get('fileName') || resource.fileName,
        uploadDate: resource.uploadDate,
        blobUrl: blobUrl
      };
      await container.item(id, partitionKey).replace(updatedItem);

      return {
        body: JSON.stringify({ message: '更新成功', updatedItem }),
        headers: { 'Content-Type': 'application/json' }
      };
    } catch (error) {
      return {
        status: 500,
        body: JSON.stringify({ message: '更新失败：' + error.message }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  }
});