OPENAI_API_KEY = None
from openai import OpenAI
import requests
import time
import pymongo
import json

client = OpenAI(api_key=OPENAI_API_KEY)

assistant_id=None
thread_id = None
mongo_url=None


def create_msg(msg,thread_id):
    thread_message = client.beta.threads.messages.create(
      thread_id,
      role="user",
      content=msg
    )
    print("message created")
    return thread_message

def retreive_msg(threadId):
    thread_messages = client.beta.threads.messages.list(threadId)
    last_message = thread_messages.data[0]
    role = last_message.role
    response = last_message.content[0].text.value
    print(f"ANSWER-----> {response}")

def function_tools(tool_calls):
    tools_outputs = []
    for tool_call in tool_calls:
        function_name = tool_call.function.name
        function_arguments = json.loads(tool_call.function.arguments);
        print(function_arguments);
        result=None;
        if(function_name=="loungeInfo"):
            result=loungeInfo(function_arguments["name"])
            if(result and len(result)):
                tools_outputs.append({
                    "tool_call_id": tool_call.id,
                    "output": str(json.dumps(result)),
                  })
    return tools_outputs;
        
def get_data_from_mongodb(db,collection,query):
    global mongo_url;
    mongoclient = pymongo.MongoClient(mongo_url)
    db = mongoclient[db];
    collection = db[collection]
    documents = collection.find(query,projection={"_id": 0,"displayName":1,"pointLocation":1,"countryCode":1,"organisationId":1,"email":1,"addressLine1":1})
#     mongoclient.close()
    return documents[0]
        
def loungeInfo(name):
    db = "ppgDev";
    collection = "lounges"
    query = {"$or":[{"name": { "$regex": f'{name}', "$options": "i" }}, {"addressLine1": { "$regex": f'{name}', "$options": "i" }}] }
    return get_data_from_mongodb(db,collection,query)
    
def ask_assistant(msg):
    try:
        if not msg:
            print("please send msg")
            return None;
        global thread_id;
        global assistant_id;
        create_msg(msg,thread_id);
        run = client.beta.threads.runs.create(
          thread_id=thread_id,
          assistant_id=assistant_id
        )

        while True:
            run = client.beta.threads.runs.retrieve(
              thread_id=thread_id,
              run_id=run.id
            )
            if(run.status=="completed"):
                print("completed...")
                retreive_msg(thread_id)
                break;
            elif(run.status=="failed"):
                print("failed...")
                break;
            elif (run.status=="queued" or run.status=="in_progress"):
                print(run.status+"...")
                time.sleep(5)
                continue;
            elif(run.status=="requires_action"):
                print("required actions...")
                run_tools = run.required_action.submit_tool_outputs.tool_calls;
                tools_outputs = function_tools(run_tools);
                if(len(tools_outputs)):
                    client.beta.threads.runs.submit_tool_outputs(
                      thread_id=thread_id,
                      run_id=run.id,
                      tool_outputs= tools_outputs
                    )
                    print("submitting actions...")
                    time.sleep(5);
                    continue;
                else:
                    print("tool_outputs length is 0");
                    break;
            else:
                print("other...",run.status)
                break;
    except Exception as e:
        # Handle or log the unknown exception
        print(f"Unknown exception occurred: {e}")


while True:
    msg = input("Question: ")
    ask_assistant(msg)
