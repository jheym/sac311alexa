const Alexa = require("ask-sdk-core");
const helper = require("../helper/helperFunctions.js");
const sfCase = require("../helper/SalesforceCaseObject.js");
const StartedFoundLostDogIntentHandler = require("../serviceRequestIntents/foundLostDog.js").StartedFoundLostDogIntentHandler;
const yn_StartedFoundLostDogIntentHandler = require("../serviceRequestIntents/foundLostDog.js").yn_StartedFoundLostDogIntentHandler;
const InProgressFoundLostDogIntentHandler = require("../serviceRequestIntents/foundLostDog.js").InProgressFoundLostDogIntentHandler;
const yn_SubmitLostDogServiceRequestIntentHandler = require("../serviceRequestIntents/foundLostDog.js").yn_SubmitLostDogServiceRequestIntentHandler;
const yn_CompletedFoundLostDogServiceRequest = require("../serviceRequestIntents/foundLostDog.js").yn_CompletedFoundLostDogServiceRequest;
const axios = require("axios");
const iso8601 = require('iso8601-duration');

helper.setQuestion = jest.fn();
helper.getOAuthToken = jest.fn();
Alexa.getSlotValue = jest.fn();
jest.mock('../helper/SalesforceCaseObject', () => {
  return jest.fn().mockImplementation((token) => {
    return {
      token: token,
      sf_url: process.env.SALESFORCE_URL,
      json_input: {},
      mapped: {},
    };
  });
});
function handlerInput(requestType, intentName, questionAsked, dialogState, confirmedPhoneNumber) {
  return {
    requestEnvelope: {
      request: {
        type: requestType,
        intent: {
          name: intentName,
       
        },
        dialogState: dialogState,
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked, confirmedPhoneNumber, 
        FoundLostDogIntent: {
          slots: {
            foundLostDogInfo: {
            }
          }
        },
      }),
      setSessionAttributes: jest.fn(),
    },
    responseBuilder :Alexa.ResponseFactory.init(),
    
    t: (input) => {
      return input;
    },
  };
}




test("StartedFoundLostDogIntentHandler › canHandle function returns true when the conditions are met", () => {
  const input = handlerInput("IntentRequest", "FoundLostDogIntent", null, "STARTED");
  expect(StartedFoundLostDogIntentHandler.canHandle(input)).toBe(true);
});


test("StartedFoundLostDogIntentHandler › handle function returns the expected output", async () => {
  const input = handlerInput("IntentRequest", "FoundLostDogIntent", null, "STARTED");
  const output = await StartedFoundLostDogIntentHandler.handle(input);
  expect(output).toEqual({
    outputSpeech: {
      ssml: "<speak>LOSTDOG_CONFIRM</speak>",
      type: "SSML",
    },
    shouldEndSession: false,
  });



  });



test("yn_StartedFoundLostDogIntentHandler › canHandle function returns true when the conditions are met", () => {
  const input = handlerInput("IntentRequest", "AMAZON.YesIntent","confirmLostDog?");
  expect(yn_StartedFoundLostDogIntentHandler.canHandle(input)).toBe(true);
});
test("yn_StartedFoundLostDogIntentHandler › canHandle function returns true when the conditions are met", () => {
  const input = handlerInput("IntentRequest", "AMAZON.NoIntent","confirmLostDog?");
  expect(yn_StartedFoundLostDogIntentHandler.canHandle(input)).toBe(true);
  
});
test("yn_StartedFoundLostDogIntentHandler › handle function returns the expected output for AMAZON.YesIntent", async () => {
  const input = handlerInput("IntentRequest", "AMAZON.YesIntent", "confiredLostDog?","IN_PROGRESS");
  const output = await yn_StartedFoundLostDogIntentHandler.handle(input);
  expect(output).toEqual({
    directives: [
      {
        slotToElicit: "userGivenAddress",
        type: "Dialog.ElicitSlot",
        updatedIntent: {
          confirmationStatus: "NONE",
          name: "GetLocationFromUserIntent",
          slots: {
            userGivenAddress: {
              confirmationStatus: "NONE",
              name: "userGivenAddress",
              value: null,
            },
          },
        },
      },
    ],

    outputSpeech: {

      ssml : "<speak>LOSTDOG_ADDRESS</speak>",
      type: "SSML",
      
    },



  });

});


test("yn_StartedFoundLostDogIntentHandler › handle function returns the expected output for AMAZON.NoIntent", async () => {
  const input = handlerInput("IntentRequest", "AMAZON.NoIntent", "confirmLostDog?");
  const output = await yn_StartedFoundLostDogIntentHandler.handle(input);



});
test("InProgressFoundLostDogIntentHandler › canHandle function returns true when the conditions are met", () => {
  const input = handlerInput("IntentRequest", "FoundLostDogIntent");
  expect(InProgressFoundLostDogIntentHandler.canHandle(input)).toBe(false);
});

test("InProgressFoundLostDogIntentHandler › handle function returns the expected output", async () => {
  const input = handlerInput("IntentRequest", "FoundLostDogIntent", null, "IN_PROGRESS", null);
  const output = await InProgressFoundLostDogIntentHandler.handle(input);

  expect(output).toEqual({
    directives: [
      {
        type: "Dialog.Delegate",
        updatedIntent: {
          confirmationStatus: "NONE",
          name: "GetPhoneNumberIntent",
          slots: {
            userGivenPhoneNumber: {
              confirmationStatus: "NONE",
              name: "userGivenPhoneNumber",
              value: null,
            },
          },
        },
      },
    ],

   

  });
});
  test("InProgressFoundLostDogIntentHandler › handle function returns the expected output for AMAZON.YesIntent", async () => {
    const input = handlerInput("IntentRequest", "AMAZON.YesIntent", null, "IN_PROGRESS");
    const output = await InProgressFoundLostDogIntentHandler.handle(input)
    expect(output).toEqual({
      directives: [
        {
          type: "Dialog.Delegate",
          updatedIntent: {
            confirmationStatus: "NONE",
            name: "GetPhoneNumberIntent",
            slots: {
              userGivenPhoneNumber: {
                confirmationStatus: "NONE",
                name: "userGivenPhoneNumber",
                value: null,
              },
            },
          },
        },
      ],

  
  
  
    });
  });
  
  test("InProgressFoundLostDogIntentHandler should return REPEAT_DESC if foundLostDogInfo slot is filled", async () => {
    const customHandlerInput = {
      requestEnvelope: {
        request: {
          type: "IntentRequest",
          intent: {
            name: "FoundLostDogIntent",
            slots: {
              foundLostDogInfo: {
                name: "foundLostDogInfo",
                confirmationStatus: "NONE",
                value: "This is a description of a found dog.",
              },
            },
          },
          dialogState: "IN_PROGRESS",
        },
      },
      attributesManager: {
        getSessionAttributes: () => ({
          questionAsked: "submitDogTicket?",
          FoundLostDogIntent: {
            slots: {
              foundLostDogInfo: {
                value: "This is a description of a found dog.",
              },
            },
          },
          confirmedPhoneNumber: true,
        }),
        setSessionAttributes: jest.fn(),
      },
      responseBuilder: Alexa.ResponseFactory.init(),
  
      t: (input) => {
        return input;
      },
    };
  
    const response = await InProgressFoundLostDogIntentHandler.handle(customHandlerInput);
    const outputSpeech = response.outputSpeech.ssml;
    const shouldEndSession = response.shouldEndSession;
  
    expect(outputSpeech).toContain("<speak>REPEAT_DESC</speak>");
    expect(shouldEndSession).toBe(false);
  });
  test("InProgressFoundLostDogIntentHandler should return REPEAT_DESC if foundLostDogInfo slot is filled", async () => {
    const input = handlerInput(
      "IntentRequest",
      "FoundLostDogIntent",
      {
        foundLostDogInfo: {
          name: "foundLostDogInfo",
          confirmationStatus: "NONE",
          value: "This is a description of a found dog.",
        },
      },
      "IN_PROGRESS",
      {
        FoundLostDogIntent: {
          slots: {
            foundLostDogInfo: {
              value: "This is a description of a found dog.",
            },
          },
        },
        confirmedPhoneNumber: true,
      }
    );
  
    const response = await InProgressFoundLostDogIntentHandler.handle(input);
    const outputSpeech = response.outputSpeech.ssml;
    const shouldEndSession = response.shouldEndSession;
  
    expect(outputSpeech).toContain("<speak>If you see a loose dog in a busy area, its best not to try to catch them, as they may run into traffic. They will likely wander into a quieter area, or someones yard where they can be safely secured. If you have already captured the dog, the best possible thing you can do for the dog is to keep them in your home and take a few days to try to find the owner before bringing them to a shelter. 92 percent of loose dogs have an owner, but most dogs brought to shelters are not found by their owners. Dogs are 12 times more likely to be found if they stay in their neighborhood, especially if you can post their picture on craigslist, nextdoor, facebook lost and found pages, and walking them around the neighborhood. For all our quick and easy tips to find a dogs owner, visit cityofsacramento.org. Holding onto the dog while you locate the owner will also help save space in crowded animal shelters. If you cannot hold onto the dog, try asking neighbors, friends, family, or doing a post on your social media. You would be amazed how many animal lovers are willing and able to be a hero to a lost dog in need. If neither you or anyone you know can care for the dog for a few days, you can make an appointment to bring the dog to the shelter by.... You can also bring the dog to the shelter without an appointment between 12pm to 5pm seven days a week. However, there may be a long late time as we prioritize emergencies and citizens with existing appointments. An appointment is highly recommended. Would you like to submit a service request to be reviewed by someone at City of Sacramento?</speak>");
    expect(shouldEndSession).toBe(false);
  });
  // Test: canHandle function returns true when the conditions are met
test("yn_SubmitLostDogServiceRequestIntentHandler canHandle function returns true when the conditions are met", () => {
  const input = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "AMAZON.YesIntent",
        },
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked: "LostDogServiceRequestCorrect?",
      }),
    },
  };
  expect(yn_SubmitLostDogServiceRequestIntentHandler.canHandle(input)).toBe(true);
});
test("yn_SubmitLostDogServiceRequestIntentHandler canHandle function returns true when the conditions are met", () => {
  const input = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "AMAZON.NoIntent",
        },
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked: "LostDogServiceRequestCorrect?",
      }),
    },
  };
  expect(yn_SubmitLostDogServiceRequestIntentHandler.canHandle(input)).toBe(true);
});
// Test: handle function returns the expected output for AMAZON.YesIntent
test("yn_SubmitLostDogServiceRequestIntentHandler handle function returns the expected output for AMAZON.YesIntent", async () => {
  const input = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "AMAZON.YesIntent",
        },
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked: "LostDogServiceRequestCorrect?",
        FoundLostDogIntent: {
          slots: {
            foundLostDogInfo: {},
          },
        },
      }),
      setSessionAttributes: jest.fn(),
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    t: (input) => {
      return input;
    },
  };

  const output = await yn_SubmitLostDogServiceRequestIntentHandler.handle(input);
  expect(output).toEqual({
    outputSpeech: {
      ssml: "<speak>GENERAL_DESC</speak>",
      type: "SSML",
    },
    shouldEndSession: false,
    directives: [
      {
        type: "Dialog.ElicitSlot",
        slotToElicit: "foundLostDogInfo",
        updatedIntent: {
          slots: {
            foundLostDogInfo: {},
          },
        },
      },
    ],
  });
});

// Test: handle function returns the expected output for AMAZON.NoIntent
test("yn_SubmitLostDogServiceRequestIntentHandler handle function returns the expected output for AMAZON.NoIntent", async () => {
  const input = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "AMAZON.NoIntent",
        },
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked: "LostDogServiceRequestCorrect?",
      }),
      setSessionAttributes: jest.fn(),
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    t: (input) => {
      return input;
    },
  };

  const output = await yn_SubmitLostDogServiceRequestIntentHandler.handle(input);
  expect(output).toEqual({
    outputSpeech: {
      ssml: "<speak>ANYTHING_ELSE_MSG</speak>",
      type: "SSML",
    },
    shouldEndSession: false,
  });
});
// Test: canHandle function returns true when the conditions are met
test("yn_CompletedFoundLostDogServiceRequest canHandle function returns true when the conditions are met", () => {
  const input = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "AMAZON.YesIntent",
        },
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked: "submitDogTicket?",
      }),
    },
  };
  expect(yn_CompletedFoundLostDogServiceRequest.canHandle(input)).toBe(true);
});
test("yn_CompletedFoundLostDogServiceRequest canHandle function returns true when the conditions are met", () => {
  const input = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "AMAZON.NoIntent",
        },
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked: "submitDogTicket?",
      }),
    },
  };
  expect(yn_CompletedFoundLostDogServiceRequest.canHandle(input)).toBe(true);
});

// Test: handle function returns the expected output
test("yn_CompletedFoundLostDogServiceRequest handle function returns the expected output", async () => {
  // Mock helper functions
  helper.getOAuthToken = jest.fn(() => Promise.resolve("fake_token"));
  helper.createGenericCase = jest.fn(() => Promise.resolve({ case_id: "fake_case_id" }));
  helper.updateGenericCase = jest.fn(() => Promise.resolve({}));


  const input = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "AMAZON.YesIntent",
        },
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked: "submitDogTicket?",
        confirmedValidatorRes: {
          Address: "123 Fake St",
        },
        confirmedPhoneNumber: "555-1234",
        FoundLostDogIntent: {
          slots: {
            foundLostDogInfo: {
              value: "A lost dog description",
            },
          },
        },
      }),
      setSessionAttributes: jest.fn(),
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    t: (input) => {
      return input;
    },
  };

  const output = await yn_CompletedFoundLostDogServiceRequest.handle(input, helper);
  expect(output).toEqual({
    outputSpeech: {
      ssml: "<speak>GENERIC_CASE_THANKS</speak>",
      type: "SSML",
    },
    shouldEndSession: false,
  });
});

test("yn_CompletedFoundLostDogServiceRequest handle function returns the expected output", async () => {
  // Mock helper functions
  helper.getOAuthToken = jest.fn(() => Promise.resolve("fake_token"));
  helper.createGenericCase = jest.fn(() => Promise.resolve({ case_id: "fake_case_id" }));
  helper.updateGenericCase = jest.fn(() => Promise.resolve({}));


  const input = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "AMAZON.YesIntent",
        },
      },
    },
    attributesManager: {
      getSessionAttributes: () => ({
        questionAsked: "submitDogTicket?",
        confirmedValidatorRes: {
          Address: "123 Fake St",
        },
        confirmedPhoneNumber: null,
        FoundLostDogIntent: {
          slots: {
            foundLostDogInfo: {
              value: "A lost dog description",
            },
          },
        },
      }),
      setSessionAttributes: jest.fn(),
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    t: (input) => {
      return input;
    },
  };

  const output = await yn_CompletedFoundLostDogServiceRequest.handle(input, helper);
  expect(output).toEqual({
    outputSpeech: {
      ssml: "<speak>GENERIC_CASE_THANKS</speak>",
      type: "SSML",
    },
    shouldEndSession: false,
  });
});

