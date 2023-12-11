# Output of tweetPrompt.pipe(llm)

{lc: 1, type: "constructor", id: ["langchain", "schema", "AIMessage"], kwargs: {content: "What are the minimum technical requirements for running Scrimba? Can I use it on an old and less powerful laptop?", additional_kwargs: {function_call: undefined}}}


# Output of retriever.invoke("string")
[Document {pageContent: "What are the technical requir...", metadata: {loc: {lines: {to: 31, from: 30}}}}, 
Document {pageContent: "What is the cost of the cours...", metadata: {loc: {lines: {to: 28, from: 24}}}}, 
Document {pageContent: "I have a question which isn’t...", metadata: {loc: {lines: {to: 251, from: 240}}}}, 
Document {pageContent: "We frequently invite Scrimba ...", metadata: {loc: {lines: {to: 66, from: 66}}}}]