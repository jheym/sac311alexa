# Maintenance Manual: Sacramento 311 Alexa Skill 


<img align="right" src="resources/Pasted%20image%2020230501202651.png" width="300" style="padding: 20px">
<img align="right" src="resources/ECS_formal_hor_stack_1p_1c_gold_hires%201.png" width="300" style="padding: 20px">

## Jump-to
[Developer environment setup](#developer-environment-setup) \
[ASK SDK basics](#ask-sdk-basics) \
[Project structure/organization](#project-structure--organization) \
[The interaction model](#the-interaction-model) \
[Slots & dialog management](#slots--dialog-management) \
[Session attributes](#session-attributes) \
[Localization](#localization) \
<br><br><br>
# Developer environment setup

### Requirements
1. Alexa Developer Account with a configured Alexa Skill
2. [VSCode](https://code.visualstudio.com/) with [Alexa Skills Kit Toolkit](https://marketplace.visualstudio.com/items?itemName=ask-toolkit.alexa-skills-kit-toolkit) Extension installed
4. [Node.js](https://nodejs.org/en/download) ( $\ge$ 14 ) installed
5. [Java JDK](https://learn.microsoft.com/en-us/java/openjdk/download) ( $\ge$ 17 ) installed
6. Must be running the code from a whitelisted IP address or in company VPN
7. Must have internet connectivity
8. Credentials for oauth salesforce server (more on that later)

Unfortunately, VSCode is the only IDE which has integrated support for locally running and debugging Alexa Skills. If VSCode is not an option, you will have to refer to the official [documentation](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/blob/2.0.x/ask-sdk-local-debug/README.md) for the Node.js ASK SDK Local Debugger and set up [LWA Token](https://developer.amazon.com/docs/login-with-amazon/conceptual-overview.html) authentication manually.

Before continuing, ensure you've installed Node.js and Java properly by checking if their commands work in your terminal, whether it's powershell, cmd, or bash.
> `node --version` \
> `java --version`

Also, you should already have an Alexa Developer account with a configured Skill ==TODO: refer to other docs to set that up first==

## Setting up VSCode Environment
==TODO: Add details to these steps==
1. Install ASK SDK Developer toolkit extension on VSCode and sign in with your Alexa Developer credentials.
2. Download your Skill with the ASK Toolkit
3. From the provided zip file, move all of the contents into the parent directory of the VSCode project folder. 
4. Fill out the missing .env contents with your credentialed information
5. In a terminal, run `npm install` from inside the **lambda/** directory
6. Run the debugger. If you see a Dinosaur appear in the debug output console, it is running correctly. If you get an error message about running Powershell scripts, you may need to set an Execution Policy to allow that script to run. For any other errors, ensure the `.env` file is set up and the **ENVIRONMENT** variable is set to `dev`. Ensure the folders and files are all in proper locations.
7. In the Alexa Developer Console simulator, type `open sacramento three one one`. If everything went well, the VSCode debugger should print some logs to the debugger output window. 

## Running the Skill Locally
The `index.js` file is the main entry point for the Skill. When the local debugger is started, it will check the **ENVIRONMENT** key in `process.env` and if the value is set to `dev`, the dynamoDB server will launch. 
![](resources/Pasted%20image%2020230425205448.png)
Once the server launches, all Alexa devices associated with your Amazon developer account will have their requests redirected to the Skill code running on your machine.

To test your skill, we recommend using the [simulator](https://developer.amazon.com/en-US/docs/alexa/devconsole/alexa-simulator.html#use-the-simulator-in-the-developer-console) in the developer console, as the VSCode Skills Toolkit simulator has issues with the local DynamoDB. Alternatively, you can log in with your Alexa Developer credentials to any Alexa-enabled device, such as a smart phone or Amazon Echo, and invoke the skill from there. The latter is useful for testing the Skill with various permissions enabled, such as location services.

### [Back to top](#jump-to)
<br><br>


# ASK SDK Basics

Towards the end of the `index.js` file, the [SkillBuilders object](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/construct-skill-instance.html#skill-builders) is responsible for constructing the Skill instance. 

<img src="resources/Pasted%20image%2020230425211147.png" width="600"/>

The `addrequestHandlers()`, `addRequestInterceptors()`, and `addResponseInterceptors()` methods register all of the event handlers defined across the project. Whenever you create a new handler, it must be registered in one of the handler arrays above.


<!-- <img align="right" src="resources/Pasted%20image%2020230425211541.png" width="300" style="padding: 10px" /> -->

<img src="resources/Pasted%20image%2020230425211541.png" width="400" style="padding: 10px">

[Request handlers](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/handle-requests.html#request-handlers) are responsible for handling one or more types of incoming requests. When a Skill user is in a session with our Skill and says `Report an abandoned vehicle`, the user's device sends the voice data to the Alexa Voice Service for natural language processing, where the Skill user's utterance is compared with our custom interaction model, using our defined utterances as "hints" for Alexa to decide which intent it should match to. 

<br>

![Pasted image 20230425214544](resources/Pasted%20image%2020230425214544.png)

Since we have a similar utterance in our interaction model, Alexa confidently resolves the voice data to the `AbandonedVehicleIntent` defined in the interaction model, and sends a request to our Skill.

Our Skill receives the request and and in turn checks each handler in the **requestHandlers\[\] array** until a handler is found. Since we have a handler for `AbandonedVehicleIntent`, the request gets handled.

<img src="resources/Pasted%20image%2020230425213230.png" width="600">

In the above example, the `StartedAbandonedVehicleIntentHandler` runs the request against the `canHandle()` function. If the `canHandle` function returns true, the `handle()` function will process the request. Since the request has **type** `IntentRequest`, and the **intent name** is `AbandonedVehicleIntent`, and since the **dialog state** of the request is `STARTED`, the request will be processed.  


All handlers contain a [handlerInput](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/handle-requests.html#handler-input) object, which contains the entire request body sent to the skill, along with helper methods for processing the request and building the response.

All `handle()` functions within a **requestHandler** must return a [responseBuilder](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/build-responses.html#responsebuilder) object. The **responseBuilder** object is responsible for constructing the response that goes back out to the Alexa Voice Service. It contains various methods, such as the **speechOutput** you want Alexa to say to the Skill user. When the **responseBuilder** object is returned, the ASK debugger will process the response and send it to the Alexa Voice service to be processed and sent to the Skill user. 

The other two types of handlers are [request interceptors and response interceptors](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/handle-requests.html#request-and-response-interceptors). They are registered in separate handler arrays in `index.js`. **Request interceptors** are executed before a request is processed by a **request handler** and **response interceptors** are executed after a **request handler** constructs a response, and before the response goes out to Alexa. 

### [Back to top](#jump-to)
<br><br>

# Project structure & organization
==TODO: Update this tree==
```bash
├── .ask # Imported by ASK SDK Developer Toolkit
│   ├── ask-states.json
│   └── schema
│       └── skillPackageSchema.json
├── .gitignore # Preconfigured
├── .vscode
│   └── launch.json # Contains the launch configuration for the debugger
├── ask-resources.json # Imported by ASK SDK Developer Toolkit
├── lambda # Skill code modularized by use case
│   ├── abandonedVehicle.js
│   ├── addressCollectionFlow.js
│   ├── ask-sdk-local-debug # Modified debugger linked by package.json
│   ├── checkCaseStatus.js
│   ├── cloggedStormDrain.js
│   ├── .env # Contains secret creds and other variables
│   ├── foundLostDog.js
│   ├── genericServiceRequest.js
│   ├── helper # Helper functions and classes
│   │   ├── SalesforceCaseObject.js # Custom case object class
│   │   ├── helperFunctions.js # Function defs used throughout the code
│   │   └── nsCommon.json # Contains all speech output strings
│   ├── index.js # Main entry file
│   ├── node_modules # Dependencies installed by NPM
│   ├── package.json # NPM config file
│   ├── phoneNumberCollection.js
│   ├── trashPickupDay.js
├── local_dynamodb # Required to run the local database
│   ├── DynamoDBLocal.jar
│   ├── DynamoDBLocal_lib
│   └── scripts # Contains scripts for managing the local db
└── skill-package # Imported by ASK SDK Developer Toolkit
    ├── interactionModels
    │   └── custom
    │       └── en-US.json
    └── skill.json
```

If the project has been fully set up following the dev environment setup instructions, the package structure should look similar to the above tree. 



## ASK SDK Developer Toolkit
The ASK SDK Developer toolkit VSCode extension is responsible for managing your Alexa Developer credentials, managing your Skill remotely, and running the local debugger. When you download your Skill using the extension, it automatically imports some required files for running the **ASK SDK Local Debugger**.



## ASK SDK Local Debugger
[ASK SDK Local Debug](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/blob/2.0.x/ask-sdk-local-debug/README.md)  is a package which enables you to test your skill code locally against your skill invocations by routing requests to your developer machine. This enables you to verify changes quickly to skill code as you can test without needing to deploy skill code to Lambda. No port forwarding is required to run the debugger.

**The debugger is required to run and test your code locally.**  We use a slightly modified version of **ASK SDK Local Debug**. We've slightly altered the debugger by removing some unnecessary console logging for more readable output, and added a dinosaur banner 🙂. If you ran `npm install` earlier, it should already be installed. 

The launch configuration we use has been provided in the `.vscode/launch.json` file. It uses commands from the **ASK SDK Developer toolkit** extension to start an authenticated session per your Amazon Developer account. 

When the debugger is running, you'll be able to utilize the debugging capabilities of the VSCode IDE such as setting breakpoints, stepping through the code, and viewing data on the stack.


## Local Dynamo Database
The local_dynamodb folder contains a portable dynamodb executable which runs automatically when the skill code starts, and stops when the skill code terminates. It contains several bash scripts containing simple commands for managing the database, such as deleting the table or listing the table items. 

If the skill code is running in a Windows environment, you can view the contents of those scripts and execute them in powershell manually. 

*Note: In order to manage the database, make sure the local skill debugger is running first.*



## Skill code
All of the skill code is contained in the `lambda/` directory. The code is organized into modules based on use case. The `lambda/helper/` directory contains various helper functions and maps used throughout the skill code. 

The main entry point for the skill code is in the `index.js` file. It contains the main handler function responsible for managing all of the event handlers throughout the project.



## Environment Variables
The `.env` file contains the environment variables that get loaded into `process.env` when the code is run by the debugger. The following environment variables should all be set.
```js
ENVIRONMENT="dev"
SF_AUTH_URL=${OAuth_Authorization_Endpoint}
SF_CLIENT_ID=${OAuth_Client_Id}
SF_CLIENT_SECRET=${OAuth_Client_Secret}
SF_USERNAME=${OAuth_Password_Grant_Type_User_Name}
SF_PASSWORD=${OAuth_Password_Grant_Type_Password}
SALESFORCE_URL="https://saccity--qa.sandbox.my.salesforce.com/services/data/v57.0"
WORLD_GEOCODER_URL="https://utility.arcgis.com/usrsvcs/servers/3f594920d25340bcb7108f137a28cda1/rest/services/World/GeocodeServer/findAddressCandidates"
INTERNAL_GIS_ENDPOINT="https://sacgis311.cityofsacramento.org"
```
The Salesforce OAuth credentials are all based on a password grant type. If you are going to change the grant type, you will need to modify the `getOAuthToken()` function in `lambda/helper/helperFunctions.js` and update the environment variables to accomodate it.



## Version Control
It will be up to you to initialize your own version control repo, but if you do, there is a preconfigured `.gitignore` to use as a template.

### [Back to top](#jump-to)
<br><br>

# The interaction model

* Refer to documentation for interaction model basics
* Show what we mean by not requiring slots
* create slot synonym types
* turn off auto delegation
* set the fallback intent sensitivity

Our [custom interaction model](https://developer.amazon.com/en-US/docs/alexa/ask-overviews/voice-interaction-models.html#custom-models) is what the **Alexa Voice Service** (we'll refer to it as **AVS**) uses to map user [utterances](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-the-interaction-model-for-your-skill.html#sample-utterances) to our [intents and slots](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-the-interaction-model-for-your-skill.html#intents-and-slots).  

The **interaction model** is managed in the **Alexa Developer Console**. We define an intent for each service request or informational request. There are also intents that involve multi-step processes such as collecting a location or a phone number from the user. 

Sometimes, intents may have no utterances, such as the `GetLocationFromUserIntent`. Intents without utterances are not meant to be triggered by a user - they are instead meant to be triggered from our code.



## Defining intent utterances
When we create an intent such as `AbandonedVehicleIntent`, we define many **utterances** that AVS will use as "hints" to map the user's input speech to our intent. 

![Pasted image 20230430171636](resources/Pasted%20image%2020230430171636.png)

In order to cut down on the number of utterances necessary, you can use slot values in the utterances. For instance, the utterance `There's an {abandoned} {vehicle}` expands to:
>There's an (unattended/neglected/unused/uninhabited/forsaken/dumped/ditched/deserted) (vehicle/motor vehicle/automobile/car)

Effectively, these slots do not need to be collected from the user, but instead act as intent utterance **synonyms** in our interaction model.

For intent utterance synonyms, we create slots in the interaction model with the naming convention \*SynonymsType, and define all the possible synonyms we think a user might say.

![Pasted image 20230430172513](resources/Pasted%20image%2020230430172513.png)



## Defining custom slots and slot utterances
**Slots** are used collect the necessary details from the user throughout a conversation. In the Skill code, we elicit slot collection manually by delegating an elicitSlot directive to the Alexa Voice Service specifying which slot we want to collect and for which intent. Alexa then listens for any of the possible synonyms we have defined in our slot. 

*Note: If no synonyms are found during slot elicitation, the [FallBackIntent](https://developer.amazon.com/en-US/docs/alexa/custom-skills/standard-built-in-intents.html#fallback) gets triggered and there is logic within our **FallBackIntentHandler** to automatically elicit the same slot again.*

Refer to [this documentation](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-and-edit-custom-slot-types.html) for how to create custom slots types and add them to an intent.
[Create and Edit Custom Slot Types | Alexa Skills Kit (amazon.com)](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-and-edit-custom-slot-types.html)

## Amazon built-in slot types
We use certain built-in slot types in the interaction model such as [AMAZON.PhoneNumber](https://developer.amazon.com/en-US/docs/alexa/custom-skills/slot-type-reference.html#phonenumber) and [AMAZON.Duration ](https://developer.amazon.com/en-US/docs/alexa/custom-skills/slot-type-reference.html#duration) to get easy-to-work-with values from users such as phone numbers and ISO8601 durations, respectively. 


## Getting raw user input from the User
Amazon does not provide any way to get the speech data spoken by the user. Instead, the **AMAZON.SearchQuery** slot type is commonly used as a workaround for this issue. We use it for collecting things like addresses, license plates, and generic descriptions from the user.



## Required slots and autodelegation
By default, automatic delegation is turned off globally. This allows us to manage the dialog manually on our end, rather than have Alexa try to fill the slots for us. Even with automatic delegation turned off, we commonly delegate the dialog to Alexa as a way to switch between intents. This means we must make sure that slots are not set to **required** in the dialog model, or else Alexa will try to fill them automatically. ![Pasted image 20230430171347](resources/Pasted%20image%2020230430171347.png)

### [Back to top](#jump-to)
<br><br>


# Slots & dialog management

In order to collect slots for a given intent, the intent must have slots defined in the interaction model. Refer to [this documentation](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-intents-utterances-and-slots.html) to learn more about intents, utterances, and slots, and how to add them to the Skill's interaction model.

For intents where more information is needed from the Skill user, we utilize manual dialog control to collect [slots](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-intents-utterances-and-slots.html#identify-slots) from the user. For the most part, we do not use [auto delegation features](https://developer.amazon.com/en-US/docs/alexa/custom-skills/dialog-interface-reference.html#dialog-scenarios), as that doesn't allow us to have as much control over the conversation.

Sometimes using the **dialog state** as a condition is useful. The possible values for **dialogState** are `STARTED`, `IN_PROGRESS`, and  `COMPLETED`. The following example makes use of **dialogState**, **slot values**, and **slot confirmationStatus** to make decisions.

```text
Alexa: Welcome to Sacramento 311, how can I help you today?

User: I'd like to report an abandoned vehicle please.
```

A value of `STARTED` means the intent has been invoked by the skill user for the first time. 
```js
const StartedAbandonedVehicleIntentHandler = {
    canHandle(handlerInput) {
        const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const dialogState = Alexa.getDialogState(handlerInput.requestEnvelope);
	    
        return (
            requestType === "IntentRequest" &&
            intentName === "AbandonedVehicleIntent" &&
            dialogState === "STARTED" // checking Dialog state
            );
        },
		
    handle(handlerInput) {
        const speechOutput = `Sure, I can take an abandoned vehicle report. \
                              What is the make of the vehicle?`
                              						  
        return handlerInput.responseBuilder
        .addElicitSlotDirective('make') // Tell Alexa to elicit the 'make' slot
        .speak(speechOutput)
        .getResponse();
    }
};
```

```text
# vehicle 'make' slot elicited

Alexa: Sure, I can take an abandoned vehicle report. What is the make of the vehicle?

User: Toyota
```

A value of `IN_PROGRESS` means a slot has been elicited or confirmed and there may or may not be more slots to fill. 

Since we used `addElicitSlotDirective` in the `StartedAbandonedVehicleIntentHandler`, the user will respond to the elicit slot question and Alexa will send back a request with **dialogState** set to `IN_PROGRESS`. It is then our job to check slot values and, optionally, if we wish to confirm the value with the user the confirmationStatus should be checked as well.

The following code shows how to check whether a slot has been filled, how to check the confirmation status of the slot, and how to confirm a slot value with the user. 

```js
const InProgressAbandonedVehicleIntentHandler = {
    canHandle(handlerInput) {
        const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const dialogState = Alexa.getDialogState(handlerInput.requestEnvelope);
        	
        return (
            requestType === "IntentRequest" &&
            intentName === "AbandonedVehicleIntent" &&
            dialogState === "IN_PROGRESS" // Checking dialog state
        );
    },    
	
	handle(handlerInput) {
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        const slots = currentIntent.slots;
        	
        if (slots.make.value) { // If the slot has not been filled, value is null
            if (slots.make.confirmationStatus === 'NONE') {
                const make = slots.make.value;
                return handlerInput.responseBuilder
                .addConfirmSlotDirective('make') // Send slot confirmation
                .speak(`Did you say the vehicle make is a ${make}?`)
                .getResponse();
            }
            	
            if (slots.make.confirmationStatus === 'DENIED') {
                const speechOutput = `I'm sorry. Let's try that again. \
                                      What is the make of the vehicle?`
                return handlerInput.responseBuilder
                .addElicitSlotDirective('make')
                .speak(speechOutput)
                .getResponse();
            }
            	
            if (slots.make.confirmationStatus === 'CONFIRMED') {
                return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent) // auto-delegation
                .getResponse();
            }
        } else {
            throw new Error(`This line should not be reached.`);
        }
    } // handle() 
};
```

```text
Alexa: Did you say the vehicle make is a Toyota?

User: No.

Alexa: I'm sorry, let's try that again. What is the make of the vehicle?

User: Mazda.

Alexa: Did you say the vehicle make is a Mazda?

User: Yes.

# Delegate dialog management to Alexa via addDelegateDirective()
```

A value of `COMPLETED` is only possible if `addDelegateDirective()` was added to the last response, and all required slots have been filled. If `addDelegateDirective()` is called and there are required slots defined in the interaction model that have no values, Alexa will try to fill them automatically. We mostly do not use required slots for this reason. 

```js
const CompletedAbandonedVehicleIntentHandler = {
    canHandle(handlerInput) {
        const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const dialogState = Alexa.getDialogState(handlerInput.requestEnvelope);
		
    return (
        requestType === "IntentRequest" &&
        intentName === "AbandonedVehicleIntent" &&
        dialogState === "COMPLETED" // Checking dialog state
        );
    },
     
    handle(handlerInput) {
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        const make = slots.make.value;
        const speechOutput = `Thank you for reporting the abandoned ${make}. Goodbye!`
        
        return handlerInput.responseBuilder
        .speak(speechOutput)
        .withShouldEndSession(true); // Ends the session
        .getResponse();
    }
};
```

```text
Alexa: Thank you for reporting the abandoned Mazda. Goodbye!
# Session Ended
```

### Resources
To learn more about Dialog Management, there is a great guide here:
[Advanced Skill Building with Dialog Management](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/guide/Dialog-Management-Guide.pdf)

### [Back to top](#jump-to)
<br><br>

# Session attributes
**Session attributes** provide a way to store and retrieve global variables throughout a session. They are managed by using the `attributesManager` methods contained in the `handlerInput` object. 

We use sessionAttributes in a few different ways:
* To set and determine *state* (e.g. checking whether a phone number has already been collected)
* To save and restore slots when switching between intents (context switching)
* To save any global variables we want to persist throughout the session

The following is a simplified example of using `sessionAttributes` and `addDelegateDirective()` to switch between intents. It also demonstrates how to use an `AMAZON.SearchQuery` slot type to collect any address from a user. The `S_AbandonedVehicleIntentHandler` recieves the initial intent request and gets the `sessionAttributes` from the `handlerInput.attributesManager()` method. 

#### AbandonedVehicleIntentHandlers
```js
const S_AbandonedVehicleIntentHandler = {
    canHandle(handlerInput) {
        const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const dialogState = Alexa.getDialogState(handlerInput.requestEnvelope);
		
        return (
            requestType === "IntentRequest" &&
            intentName === "AbandonedVehicleIntent" &&
            dialogState === "STARTED"
        );
    },
    handle(handlerInput) {
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const currentIntent = requestEnvelope.request.intent; // AbandonedVehicleIntent
        
        // Getting and setting session attributes
        const sessionAttributes = attributesManager.getSessionAttributes();
        sessionAttributes.intentToRestore = currentIntent;
        attributesManager.setSessionAttributes(sessionAttributes);

        // If we have already collected an address during this session, it will
        // exist in session attributes. Otherwise, delegate to GetAddressIntent.
        if (sessionAttributes.address) {
            return responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();
        } else {
            // Note: We cannot use the .speak() directive in the responseBuilder
            // when delegating dialog management to Alexa. 
            return responseBuilder
            .addDelegateDirective('GetAddressIntent')
            .getResponse();
        }
    } // handle()
};


const IPC_AbandonedVehicleIntentHandler = {
    canHandle(handlerInput) {
        const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const dialogState = Alexa.getDialogState(handlerInput.requestEnvelope);
		
        return (
            requestType === "IntentRequest" &&
            intentName === "AbandonedVehicleIntent" &&
            (dialogState === 'IN_PROGRESS' || dialogState === 'COMPLETED')
        );
    },
    handle(handlerInput) {
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const slots = requestEnvelope.request.intent.slots;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        
        if (!sessionAttributes.address) {
            const speechOutput = `I'm sorry, something went wrong while collecting the \
                                  location of the vehicle. Please try again later.`

            return responseBuilder
            .speak(speechOutput)
            .withShouldEndSession(true)
            .getResponse();
        }
        
        if (sessionAttributes.address && !slots.make.value) {
            const speechOutput = `Thank you for providing the location of the vehicle. \
                                  What is the make of the vehicle?`
            
            return responseBuilder
            .addElicitSlotDirective('make')
            .speak(speechOutput)
            .getResponse();
        }
        
        if (sessionAttributes.address && slots.make.value) {
            const speechOutput = `Thank you for providing the location and make of the \
                                  vehicle. I have created a service request for you. \
                                  Goodbye!`
  
            return responseBuilder
            .speak(speechOutput)
            .withShouldEndSession(true)
            .getResponse();
        }
    } // handle()
};
```

If an address has already been collected this session, it will delegate the dialog to Alexa and Alexa will in turn send back an `AbandonedVehicleIntent` request with a `COMPLETED` **dialogState** (assuming the 'make' slot is not a **required slot** in the interaction model).

If there is no `address` object within the **session attributes**, we use the `addDelegateDirective()` and specify the name of the intent we wish to delegate to. *Note: `addDelegateDirective` accepts either an intent name or an intent object as a parameter.*

#### GetAddressIntentHandler
```js
const GetAddressIntentHandler = {
    canHandle(handlerInput) {
        const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
		
        return (
            requestType === "IntentRequest" &&
            intentName === "AbandonedVehicleIntent"
        );
    },
    
    handler(handlerInput) {
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
        const slots = requestEnvelope.request.intent.slots;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        if (sessionAttributes.address) {
            const intentToRestore = sessionAttributes.intentToRestore;
            
            // cleanup
            delete sessionAttributes.intentToRestore;
            attributesManager.setSessionAttributes(sessionAttributes);
            
            return responseBuilder
            .addDelegateDirective(intentToRestore)
            .getResponse();
        }
        
        if (!sessionAttributes.address && slots.address.value) {
            sessionAttributes.address = slots.address.value;
            const intentToRestore = sessionAttributes.intentToRestore;
            
            // cleanup
            delete sessionAttributes.intentToRestore;
            attributesManager.setSessionAttributes(sessionAttributes);
            
            return responseBuilder
            .addDelegateDirective(intentToRestore)
            .getResponse();    
        }
        
        const speechOutput = `Sure, please say an address or cross street.`
        
        return responseBuilder
        .speak(speechOutput)
        .addElicitSlotDirective('address')
        .getResponse();
        
    } // handler()
};
```

This was just a simple example showing the basics of how we manage dialog flow, but there are other helper methods and background tasks we use to abstract some of the code above. One particular abstraction is the `ContextSwitchingInterceptor` located in `index.js`, which is responsible for automatically filling the slots of intents which have been entered previously within the session.

### [Back to top](#jump-to)
<br><br>

# Localization

All speechoutput strings should be stored in `nsCommon.json`. Although it decreases readability for developers, it allows for multi language support to be added in the future, or for non-developers to easily change the speech outputs themselves. 

![Pasted image 20230430185452](resources/Pasted%20image%2020230430185452.png)

For more information about this implementation, see this article about Localization using the i18next npm library.
[How to Localize Your Alexa Skills : Alexa Blogs (amazon.com)](https://developer.amazon.com/blogs/alexa/post/285a6778-0ed0-4467-a602-d9893eae34d7/how-to-localize-your-alexa-skills)