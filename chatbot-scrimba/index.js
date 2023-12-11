/// We have generated embeddings from the document(a text document after splitting into a chunk)

const {RecursiveCharacterTextSplitter} = require("langchain/text_splitter");
const fs = require("fs");
const esClient = require("./connections/elasticsearch");
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { ElasticClientArgs, ElasticVectorSearch } = require('langchain/vectorstores/elasticsearch')

const result = fs.readFileSync('./scrimbaText.txt').toString();


// DO SOME STUFF WITH THIS
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize:500,  // defaults to 1000
  separators:["\n\n","\n"," ",""],   //paragraph, sentence, words
  chunkOverlap:50
})
  
const output = splitter.createDocuments([result]);

output
.then((val)=>{
  return addItemToElasticIndexWithPdf(val)
})
.then((resp)=>{
  console.log(resp.message);
})
.catch((err)=>{
  console.log(err)
})

const addItemToElasticIndexWithPdf = async function(docObjs){
  const response = {error:false,message:""}
  const clientArgs = {
      client: esClient,
      indexName: 'scrimba-ai'
  }

  const embeddings = new OpenAIEmbeddings({openAIApiKey:process.env.openAIApiKey});
  docObjs.forEach((item)=>{
    item.metadata = {
      location: "item.metadata.loc.lines"
    }
  })
  try{
    await ElasticVectorSearch.fromDocuments(docObjs, embeddings, clientArgs);
    response.message = "Data saved successfully";
  }catch(err){
    response.error=true;
    response.message=err.message
  }
  
  return response;
}


