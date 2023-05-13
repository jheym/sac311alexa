const Alexa = require('ask-sdk-core');
const GetPhoneNumberIntentHandler = require('../phoneNumberCollection.js').GetPhoneNumberIntentHandler;
const helper = require('../helper/helperFunctions.js');
const {switchIntent} = require('../helper/helperFunctions.js');

describe('GetPhoneNumberIntentHandler', () => {

  // Set up handlerInput object
  const handlerInput = {
    requestEnvelope: {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'GetPhoneNumberIntent',
          slots: {
            userGivenPhoneNumber: {
              name: 'userGivenPhoneNumber',
              value: '1234567890'
            }
          }
        }
      },
      session: {
        new: false,
        sessionId: 'testSessionId',
        attributes: {},
        user: {
          userId: 'testUserId',
        },
        application: {
          applicationId: 'testApplicationId',
        },
      },
      context: {
        System: {
          person: {
            personId: 'testPersonId',
          },
        },
      },
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    attributesManager: {
      getPersistentAttributes: jest.fn().mockReturnValue({}),
      setPersistentAttributes: jest.fn().mockReturnThis(),
      savePersistentAttributes: jest.fn().mockReturnThis(),
      deletePersistentAttributes: jest.fn().mockReturnThis(),
      getSessionAttributes: jest.fn().mockReturnValue({}),
      setSessionAttributes: jest.fn().mockReturnThis(),
    },
  };

  //check if the intent can be handled
  test('should be able to handle GetPhoneNumberIntent', () => {
    expect(GetPhoneNumberIntentHandler.canHandle(handlerInput)).toBe(true);
  },10000);
  

  

  // Mock helper functions
  helper.isPhoneNumberAvailable = jest.fn().mockReturnValue(false);
  helper.getPhoneNumber = jest.fn().mockResolvedValue('1234567890');
  helper.sendProgressiveResponse = jest.fn().mockReturnThis();
  helper.getFailCounter = jest.fn().mockReturnValue(0);
  helper.incFailCounter = jest.fn().mockReturnThis();
  helper.clearFailCounter = jest.fn().mockReturnThis();
  helper.switchIntent = jest.fn().mockReturnValue({
    name: 'GetPhoneNumberIntent',
    confirmationStatus: 'NONE',
    slots: {
      userGivenPhoneNumber: {
        name: 'userGivenPhoneNumber',
        value: null,
        confirmationStatus: 'NONE',
      },
    },
  });

  test('should ask for the phone number if not provided', async () => {
    // Remove the value from userGivenPhoneNumber slot
    handlerInput.requestEnvelope.request.intent.slots.userGivenPhoneNumber.value = null;

    // Call GetPhoneNumberIntentHandler
    const response = await GetPhoneNumberIntentHandler.handle(handlerInput);

    // Check that the outputSpeech.ssml contains the expected prompt
    expect(response.outputSpeech.ssml).toContain('Please say your phone number, including the area code.');
  },10000);
 
 

  // Add more test cases based on the different scenarios in the GetPhoneNumberIntentHandler
  test('should store confirmed phone number in session attributes and delegate back to the original intent', async () => {
    // Set userGivenPhoneNumber slot value and confirmationStatus
    handlerInput.requestEnvelope.request.intent.slots.userGivenPhoneNumber.value = '1234567890';
    handlerInput.requestEnvelope.request.intent.slots.userGivenPhoneNumber.confirmationStatus = 'CONFIRMED';
  
    // Set sessionAttributes.intentToRestore
    handlerInput.attributesManager.getSessionAttributes = jest.fn().mockReturnValue({
      intentToRestore: {
        name: 'SomeIntent',
        confirmationStatus: 'NONE',
        slots: {},
      },
    });
  
    // Call GetPhoneNumberIntentHandler
    const response = await GetPhoneNumberIntentHandler.handle(handlerInput);
  
    // Check that sessionAttributes.confirmedPhoneNumber is set
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    expect(sessionAttributes.confirmedPhoneNumber).toEqual('1234567890');
  
    // Check that the response is a delegate directive
    expect(response.directives).toContainEqual(expect.objectContaining({
      type: 'Dialog.Delegate',
    }));
  
    // Check that the response has the correct updatedIntent property
    const delegateDirective = response.directives.find((directive) => directive.type === 'Dialog.Delegate');
    expect(delegateDirective.updatedIntent.name).toEqual('GetPhoneNumberIntent');
    expect(delegateDirective.updatedIntent.confirmationStatus).toEqual('NONE');
    expect(delegateDirective.updatedIntent.slots).toEqual({
      userGivenPhoneNumber: {
        name: 'userGivenPhoneNumber',
        confirmationStatus: 'NONE',
        value: null,
      },
    });
    
  },10000);
  test('should continue without phone number if denied 3 times and delegate back to the original intent', async () => {
    // Update the confirmationStatus of userGivenPhoneNumber slot
    handlerInput.requestEnvelope.request.intent.slots.userGivenPhoneNumber.confirmationStatus = 'DENIED';
  
    // Set up session attributes to simulate denying the phone number 3 times
    const sessionAttributes = {
      failCounter: 2,
      intentToRestore: 'GetPhoneNumberIntent',
    };
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
  
    // Mock helper.getFailCounter to return 2 for this test case
    helper.getFailCounter = jest.fn().mockReturnValue(2);
  
    // Call GetPhoneNumberIntentHandler
    const response = await GetPhoneNumberIntentHandler.handle(handlerInput);
  
    // Check that the response is a delegate directive
    expect(response).toEqual(
      expect.objectContaining({
        directives: expect.arrayContaining([
          expect.objectContaining({
            type: 'Dialog.Delegate',
          }),
        ]),
      }),
    );
  
    // Check that the confirmedPhoneNumber is set to 'FAILED'
    expect(handlerInput.attributesManager.getSessionAttributes().confirmedPhoneNumber).toEqual('FAILED');


    // Check that the response has the correct updatedIntent property
    const delegateDirective = response.directives.find((directive) => directive.type === 'Dialog.Delegate');
    expect(delegateDirective.updatedIntent.name).toEqual('GetPhoneNumberIntent');
    expect(delegateDirective.updatedIntent.confirmationStatus).toEqual('NONE');
    expect(delegateDirective.updatedIntent.slots).toEqual({
      userGivenPhoneNumber: {
        name: 'userGivenPhoneNumber',
        value: null,
        confirmationStatus: 'NONE',
   
      },

  });

},10000);
test("should elicit phone number again if denied but failCounter is less than 2", async () => {
  // Update the confirmationStatus of userGivenPhoneNumber slot
  handlerInput.requestEnvelope.request.intent.slots.userGivenPhoneNumber.confirmationStatus =
    "DENIED";

  // Set up session attributes to simulate denying the phone number once
  const sessionAttributes = {
    failCounter: 1,
    intentToRestore: "GetPhoneNumberIntent",
  };
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  // Mock helper.getFailCounter to return 1 for this test case
  helper.getFailCounter = jest.fn().mockReturnValue(1);

  // Call GetPhoneNumberIntentHandler
  const response = await GetPhoneNumberIntentHandler.handle(handlerInput);

  // Check that the outputSpeech.ssml contains the expected prompt
  expect(response.outputSpeech.ssml).toContain(
    "Please say your phone number including the area code."
  );

  // Check that the response has the correct addElicitSlotDirective property
  expect(response.directives).toContainEqual(
    expect.objectContaining({
      type: "Dialog.ElicitSlot",
      slotToElicit: "userGivenPhoneNumber",
    })
  );
},10000);
test("should ask for confirmation if user has given a phone number but not confirmed it", async () => {
  const handlerInput = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "GetPhoneNumberIntent",
          slots: {
            userGivenPhoneNumber: {
              name: "userGivenPhoneNumber",
              value: "1234567890",
              confirmationStatus: "NONE",
            },
          },
        },
      },
    },
    attributesManager: {
      setSessionAttributes: jest.fn(),
      getSessionAttributes: jest.fn().mockReturnValue({}),
    },
    responseBuilder: {
      speak: jest.fn().mockReturnThis(),
      addConfirmSlotDirective: jest.fn().mockReturnThis(),
      getResponse: jest.fn().mockReturnValue({}),
    },
  };

  // Call GetPhoneNumberIntentHandler
  await GetPhoneNumberIntentHandler.handle(handlerInput);

  // Check that the outputSpeech.ssml contains the expected prompt
  expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
    expect.stringContaining(
      "You said your phone number is <say-as interpret-as=\"telephone\">1234567890</say-as>. Is that correct?"
    )
  );

  // Check that the response has the correct addConfirmSlotDirective property
  expect(handlerInput.responseBuilder.addConfirmSlotDirective).toHaveBeenCalledWith(
    "userGivenPhoneNumber",
    expect.objectContaining({
      name: "GetPhoneNumberIntent",
      confirmationStatus: "NONE",
      slots: expect.objectContaining({
        userGivenPhoneNumber: expect.objectContaining({
          name: "userGivenPhoneNumber",
          value: "1234567890",
          confirmationStatus: "NONE",
        }),
      }),
    })
  );
},10000);
test("should ask if the user wants to use the device phone number if no phone number is provided", async () => {
  const handlerInput = {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: {
          name: "GetPhoneNumberIntent",
          slots: {
            userGivenPhoneNumber: {
              name: "userGivenPhoneNumber",
              value: null,
              confirmationStatus: "NONE",
            },
          },
        },
      },
    },
    attributesManager: {
      setSessionAttributes: jest.fn(),
      getSessionAttributes: jest.fn().mockReturnValue({}),
    },
    responseBuilder: {
      speak: jest.fn().mockReturnThis(),
      addConfirmSlotDirective: jest.fn().mockReturnThis(),
      getResponse: jest.fn().mockReturnValue({}),
    },
  };

  // Mock helper functions
  helper.isPhoneNumberAvailable = jest.fn().mockReturnValue(true);
  helper.getPhoneNumber = jest.fn().mockReturnValue("9876543210");

  // Call GetPhoneNumberIntentHandler
  await GetPhoneNumberIntentHandler.handle(handlerInput);

  // Check that the outputSpeech.ssml contains the expected prompt
  expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
    "<speak>I found a phone number associated with your Amazon account. The number is <say-as interpret-as=\"telephone\">9876543210</say-as>. Would you like to use this number for your service request?</speak>"
  );

  // Check that the response has the correct addConfirmSlotDirective property
  expect(handlerInput.responseBuilder.addConfirmSlotDirective).toHaveBeenCalledWith(
    "userGivenPhoneNumber",
    expect.objectContaining({
      name: "GetPhoneNumberIntent",
      confirmationStatus: "NONE",
      slots: expect.objectContaining({
        userGivenPhoneNumber: expect.objectContaining({
          name: "userGivenPhoneNumber",
          value: "9876543210",
          confirmationStatus: "NONE",
        }),
      }),
    })
  );
},10000);

  
  
});
