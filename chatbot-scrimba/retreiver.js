const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { ElasticClientArgs, ElasticVectorSearch } = require('langchain/vectorstores/elasticsearch');
const esClient = require("./connections/elasticsearch");

const embeddings = new OpenAIEmbeddings({openAIApiKey:process.env.openAIApiKey});
const vectorStore = new ElasticVectorSearch(embeddings,{
    client:esClient,
    indexName:"scrimba-ai"
})

const retriever = vectorStore.asRetriever();

// const response2 = await retriever.invoke('Will Scrimba work on an old laptop?')

module.exports = retriever;