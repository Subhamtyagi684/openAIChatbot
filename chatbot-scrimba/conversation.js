/// Now, we will ask to convert our query to standalone question
// what is prompt template ?
const {ChatOpenAI} = require("langchain/chat_models/openai");
const {PromptTemplate} = require("langchain/prompts");
const llm = new ChatOpenAI({openAIApiKey:process.env.openAIApiKey})
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const esClient = require("./connections/elasticsearch");
const {StringOutputParser}  = require("langchain/schema/output_parser")
const retriever = require("./retreiver");
const {RunnableSequence,RunnablePassthrough}  = require("langchain/schema/runnable")

async function generateStandAloneQuestion(query){
    
    const tweetTemplate = `Given a question, convert it into a standalone question: 
    question: {query} 
    standalone question:
    `

   
    const tweetPrompt = PromptTemplate.fromTemplate(tweetTemplate)

    // AI understands the concept of standalone question, we dont need to explain it

    // console.log(tweetPrompt)

    // {
    //     lc_serializable: true,
    //     lc_kwargs: {
    //         inputVariables: [ 'product_desc' ],
    //         templateFormat: 'f-string',
    //         template: 'Generate a promotional tweet for the product, from this description: {product_desc}'
    //     },
    //     lc_runnable: true,
    //     lc_namespace: [ 'langchain_core', 'prompts', 'prompt' ],
    //     inputVariables: [ 'product_desc' ],
    //     outputParser: undefined,
    //     partialVariables: undefined,
    //     templateFormat: 'f-string',
    //     template: 'Generate a promotional tweet for the product, from this description: {product_desc}',
    //     validateTemplate: true
    // }
    
     /**
     * Challenge:
     * 1. Create a template and prompt to get an answer to 
     *    the user's original question. Remember to include 
     *    the original question and the text chunks we got 
     *    back from the vector store as input variables. Call 
     *    these input variables 'question' and 'context'.
     * ⚠️ Feel free to add this to the chain, but you will get 
     *    an error.
     * 
     * We want this chatbot to:
     *  - be friendly
     *  - only answer from the context provided and never make up 
     *    answers
     *  - apologise if it doesn't know the answer and advise the 
     *    user to email help@scrimba.com
    */

     const answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given question about Scrimba based on the context provided. Try to find the answer in the context. If you really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the questioner to email help@scrimba.com. Don't try to make up an answer. Always speak as if you were chatting to a friend.
     context: {context}
     question: {question}
     answer: 
     `

     const answerPrompt = PromptTemplate.fromTemplate(answerTemplate)


    // const tweetChain = tweetPrompt.pipe(llm)  // it will send the output of tweetPrompt as input in llm
    // console.log(tweetChain)  --> it will tell sequence, first and last
    

    // const tweetChain = tweetPrompt.pipe(llm)
    // tweetPrompt.pipe(llm).pipe(retriever)
    // The problem with above line is vecoreChain/retreiver is asking for only string, but it receiving object, you can see in .md file
    // to solve this,we can send .content ,but langchain gives best method for this , we will use stringParser
    
    function combineDocuments(docs){
        return docs.map((doc)=>doc.pageContent).join('\n\n')
    }
    // const tweetChain = tweetPrompt
    // .pipe(llm)
    // .pipe(new StringOutputParser())
    // .pipe(retriever)
    // .pipe(combineDocuments)
    // .pipe(answerPrompt)

    // we can also create a chain with Runnable Sequence

    const tweetChain = RunnableSequence.from([tweetPrompt,llm,new StringOutputParser()]);
    const retreiverChain = RunnableSequence.from([retriever,combineDocuments])
    const answerChain = RunnableSequence.from([answerPrompt,llm,new StringOutputParser()])

    const chain = RunnableSequence.from([
        {
            input: tweetChain,
            original: new RunnablePassthrough()
        },
        {
            context: RunnableSequence.from([(orig)=>orig.input,retreiverChain]),
            question: ({original})=>original.query
        },
        answerChain
    ])

    //it invokes direct from the prompt, but we also have to pass the retreiver
    // it will throw error if we invoke empty
    const response = await chain.invoke({
        query
    })  
    
    return response;
}

async function askQuestionWithArray(question,conv_history){
    
    const standaloneQuestionTemplate = `Given some conversation history (if any) and a question, convert the question to a standalone question. 
    conversation history: {conv_history}
    question: {question} 
    standalone question:
    `
   
    const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate)

    const answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given question about Scrimba based on the context provided and the conversation history. Try to find the answer in the context. If the answer is not given in the context, find the answer in the conversation history. If you really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the questioner to email help@scrimba.com. Don't try to make up an answer. Always speak as if you were chatting to a friend.
    context: {context}
    conversation history: {conv_history}
    question: {question}
    answer: 
    `

    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate)

    function combineDocuments(docs){
        return docs.map((doc)=>doc.pageContent).join('\n\n')
    }
    const tweetChain = RunnableSequence.from([standaloneQuestionPrompt,llm,new StringOutputParser()]);
    const retreiverChain = RunnableSequence.from([retriever,combineDocuments])
    const answerChain = RunnableSequence.from([answerPrompt,llm,new StringOutputParser()])

    const chain = RunnableSequence.from([
        {
            input: tweetChain,
            original: new RunnablePassthrough()
        },
        {
            context: RunnableSequence.from([(orig)=>orig.input,retreiverChain]),
            question: ({original})=>original.question,
            conv_history:({ original }) => original.conv_history
        },
        answerChain
    ])
    const response = await chain.invoke({
        question,
        conv_history
    })  
    return response;
}

async function generateEmbeddingForString(str){
    const embeddings = new OpenAIEmbeddings({openAIApiKey:process.env.openAIApiKey});
    let strEmbeddings  = await embeddings.embedQuery(str);
    return strEmbeddings;
}

async function matchEmbeddingsFromES(strEmbeddings){
    let esSearch = await esClient.search({
        index: "scrimba-ai",
        from: 0,
        body: {
            "knn": {
                "field": "embedding",
                "query_vector": strEmbeddings,
                "k": 4,
                "num_candidates": 100,
            },
            "fields": ["text"]
        }
    })

    return esSearch;

}




const conversationMemory = [];

module.exports = {
    generateStandAloneQuestion,
    askQuestionWithArray
}

// const query = "What are the technical requirements for running Scrimba? I only have a very old laptop which is not that powerful."

// generateStandAloneQuestion(query)
// .then((val)=>{
//     conversationMemory.push({
//         Human: query,
//         AI:val
//     })
// })
// .catch((err)=>{
//     console.log({error:err})
// })


//To fetch the chunk from the chunks, it returns the chunk only, not the answer of your question
// generateStandAloneQuestion(query)
// .then((val)=>{
//     return generateEmbeddingForString(val)
// })
// .then((emb)=>{
//     return matchEmbeddingsFromES(emb);
// })
// .then((finalResponse)=>{
//     console.log({
//         total: finalResponse.hits.total,
//         _score: finalResponse.hits.max_score,
//         hits: finalResponse.hits.hits
//     })
//     return;
// })
// .catch((err)=>{
//     console.log({error:err})
// })


// const vectorStore = new SupabaseVectorStore(embeddings, {
//     client,
//     tableName: 'documents',
//     queryName: 'match_documents'
// })

// const retriever = vectorStore.asRetriever()

// const response2 = await retriever.invoke('Will Scrimba work on an old laptop?')
