const {ChatOpenAI} = require("langchain/chat_models/openai");
const {PromptTemplate} = require("langchain/prompts");
const {StringOutputParser}  = require("langchain/schema/output_parser")
const {RunnableSequence,RunnablePassthrough}  = require("langchain/schema/runnable")

const llm = new ChatOpenAI( {openAIApiKey:process.env.openAIApiKey})

const punctuationTemplate = `Given a sentence, add punctuation where needed. 
    sentence: {sentence}
    sentence with punctuation:  
    `
const punctuationPrompt = PromptTemplate.fromTemplate(punctuationTemplate)

const grammarTemplate = `Given a sentence correct the grammar.
    sentence: {punctuated_sentence}
    sentence with correct grammar: 
    `
const grammarPrompt = PromptTemplate.fromTemplate(grammarTemplate)

const translationTemplate = `Given a sentence, translate that sentence into {language}
    sentence: {grammatically_correct_sentence}
    translated sentence:
    `
const translationPrompt = PromptTemplate.fromTemplate(translationTemplate)

// it is a better way to create chain
var chain = RunnableSequence.from([
    punctuationPrompt,
    llm,
    new StringOutputParser(),
    // grammarPrompt -> Here it will throw error, because a direct string is passed from above result
    //                  but we need a input_variable as punctuated_sentence
])

//it is not a best way, but we can do this, we have used prevResult arrow function because grammar prompt needed object
var chain = RunnableSequence.from([
    punctuationPrompt,
    llm,
    new StringOutputParser(),
    {punctuated_sentence: prevResult => prevResult},
    grammarPrompt,
    llm,
    new StringOutputParser(),
])

// we can write a much better way
// we can add runnable sequence inside a runnable sequence
const punctuationChain = RunnableSequence.from([punctuationPrompt, llm, new StringOutputParser(),])
// or we can use a punctuationPrompt.pipe(llm).pipe(new StringOutputParser()) , it doesn't matter

const translationChain = RunnableSequence.from([translationPrompt,llm, new StringOutputParser()])

const grammarChain = RunnableSequence.from([
    grammarPrompt,
    llm,
    new StringOutputParser()
])

var chain = RunnableSequence.from([
    { 
        punctuated_sentence: punctuationChain ,
        original: new RunnablePassthrough()
    },
    {
        grammatically_correct_sentence:grammarChain,
        language: (org)=> org.original.language
    },
    translationChain
])

chain.invoke({
    sentence: 'i dont liked mondays',
    language: 'french'
}).then((val)=>{
    console.log(val)
})
.catch((err)=>{
    console.log(err)
})