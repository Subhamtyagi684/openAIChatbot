const readline = require('readline');
const {generateStandAloneQuestion,askQuestionWithArray} = require("./conversation")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
let conversationMemory = [];

function formatConvHistory(messages) {
    if(!messages.length){
        return ""
    }
    return messages.map((message, i) => {
        if (i % 2 === 0){
            return "Human: "+message;
        } else {
            return "AI: "+message;
        }
    }).join('\n')
}


let check = true;
function main(){
    rl.question('Ask something: ', async (question) => {
        if(question=="exit"){
            console.log(conversationMemory)
            rl.close()
            return;
        }else{
            console.log("Please wait while generating the answer...")
            let reply = await askQuestionWithArray(question,formatConvHistory(conversationMemory));
            conversationMemory.push(question);
            conversationMemory.push(reply);
            console.log("Answer: ",reply);
            main()
        }
        
    });
}

main();
