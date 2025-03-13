const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { CosmosClient } = require('@azure/cosmos');
// CI/CD test comment
app.http('upload', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const file = await request.formData().then(form => form.get('file'));
      if (!file) throw new Error('请提供文件');

      const storageConnectionString = "DefaultEndpointsProtocol=https;AccountName=mediasyncstorage;AccountKey=ZqFyaBFzEKA7OWOF0F0IU2PxbwWopX1NnAQ08b9MKWG2L/OcWX9Hv9NIkTKw3GAINnk66lPIlkrZ+AStV8eSdw==;EndpointSuffix=core.windows.net";
      const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
      const containerClient = blobServiceClient.getContainerClient('media-files');
      const blobName = `${Date.now()}-${file.name}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await blockBlobClient.uploadData(fileBuffer);

      const cosmosEndpoint = "https://mediasync-cosmos.documents.azure.com:443/";
      const cosmosKey = "GxQeRE2gEjvlBXgxF7YSUl3teAS68PfuWnmdypADSKTmpQpwjT0qKrUdNmh5P9CjacIYjg9g3VnDACDbgaVGgg==";
      const cosmosClient = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
      const database = cosmosClient.database('MediaDB');
      const container = database.container('MediaItems');
      const item = {
        id: blobName,
        userId: 'user123',
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        blobUrl: blockBlobClient.url
      };
      await container.items.create(item);

      return {
        body: JSON.stringify({ message: '文件上传成功！', id: blobName }),
        headers: { 'Content-Type': 'application/json' }
      };
    } catch (error) {
      return {
        status: 500,
        body: JSON.stringify({ message: '上传失败：' + error.message }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  }
});
