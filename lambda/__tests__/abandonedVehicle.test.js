const Alexa = require("ask-sdk-core")
const helper = require("../helper/helperFunctions.js")
const sfCase = require("../helper/SalesforceCaseObject.js")
const iso8601 = require('iso8601-duration');

const StartedAbandonedVehicleIntentHandler = require("../serviceRequestIntents/abandonedVehicle.js").StartedAbandonedVehicleIntentHandler;
const InProgressAbandonedVehicleIntentHandler = require("../serviceRequestIntents/abandonedVehicle.js").InProgressAbandonedVehicleIntentHandler;
const CompletedAbandonedVehicleIntentHandler = require("../serviceRequestIntents/abandonedVehicle.js").CompletedAbandonedVehicleIntentHandler;
const yn_IsAbandonedVehicleIntentHandler = require("../serviceRequestIntents/abandonedVehicle.js").yn_IsAbandonedVehicleIntentHandler;
const yn_ConfirmVehicleDescriptionIntentHandler = require("../serviceRequestIntents/abandonedVehicle.js").yn_ConfirmVehicleDescriptionIntentHandler;
const yn_ConfirmLicensePlateIntentHandler = require("../serviceRequestIntents/abandonedVehicle.js").yn_ConfirmLicensePlateIntentHandler;

helper.setQuestion = jest.fn();
helper.sendProgressiveResponse = jest.fn();
helper.toDays = jest.fn();
helper.getOAuthToken = jest.fn();
helper.createGenericCase = jest.fn();
helper.updateGenericCase = jest.fn();
helper.openIntegratedCase = jest.fn();
helper.updateIntegratedCase = jest.fn();
helper.clearContextIntent = jest.fn();
helper.isGeolocationAvailable = jest.fn();
helper.clearFailCounter = jest.fn();
helper.sendProgressiveResponse = jest.fn();
helper.incFailCounter = jest.fn();
helper.clearSlots = jest.fn();
describe("StartedAbandonedVehicleIntentHandler", () => {

    test('canHandle', () => {
        const handlerInput = {
           requestEnvelope: {
              request:{
                type: 'IntentRequest',
                intent:{
                    name: 'AbandonedVehicleIntent',
                },
                dialogState: 'STARTED',

              },
           },
        };
    expect(StartedAbandonedVehicleIntentHandler.canHandle(handlerInput)).toBe(true);
    });
    test('handle generates correct reprompt output', () => {
        const handlerInput = {
          requestEnvelope: {
            request: {
              type: 'IntentRequest',
              intent: {
                name: 'AbandonedVehicleIntent',
              },
              dialogState: 'STARTED',
            },
          },
          responseBuilder: Alexa.ResponseFactory.init(),
          t: jest.fn((key) => key),
        };
      
        const response = StartedAbandonedVehicleIntentHandler.handle(handlerInput);
        expect(response.reprompt.outputSpeech.ssml).toContain('ABANDONED_VEHICLE_REPROMPT');
      });
      
});
// function createHandlerInput(requestType, intentName, dialogState, sessionAttributes, slots) {
//     const responseBuilder = Alexa.ResponseFactory.init();
//     responseBuilder.addDelegateDirective = jest.fn().mockReturnThis(); // chain the mock
//     responseBuilder.getResponse = jest.fn();
//     responseBuilder.speak = jest.fn().mockReturnThis();

//     return {
//       attributesManager: {
//         getSessionAttributes: jest.fn().mockReturnValue(sessionAttributes),
//       },
//       requestEnvelope: {
//         request: {
//           type: requestType,
//           intent: {
//             name: intentName,
//             slots: slots
            
//           },
//           dialogState: dialogState,
//         },
//       },
//       responseBuilder: responseBuilder,
//       t: jest.fn((key) => key),
//     };
//   }
  
  

describe('InProgressAbandonedVehicleIntentHandler', () => {
  let handlerInput;

  beforeEach(() => {
    handlerInput = {
      attributesManager: {
        getSessionAttributes: jest.fn(),
        setSessionAttributes: jest.fn(),
      },
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'AbandonedVehicleIntent',
            confirmationStatus: 'NONE',
            slots: {
              timePeriod: { value: null },
              licensePlate: { value: null },
              make: { value: null },
              model: { value: null },
              color: { value: null },
            },
          },
        },
      },
      responseBuilder: Alexa.ResponseFactory.init(),
    };
  });

  test('canHandle returns true when the intent is AbandonedVehicleIntent and dialog state is IN_PROGRESS', () => {
    handlerInput.requestEnvelope.request.dialogState = 'IN_PROGRESS';
    expect(InProgressAbandonedVehicleIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  test('canHandle returns false when the intent is not AbandonedVehicleIntent', () => {
    handlerInput.requestEnvelope.request.intent.name = 'AbandonedVehicleIntent';
    expect(InProgressAbandonedVehicleIntentHandler.canHandle(handlerInput)).toBe(false);
  });

  test('canHandle returns false when the dialog state is not IN_PROGRESS', () => {
    handlerInput.requestEnvelope.request.dialogState = 'COMPLETED';
    expect(InProgressAbandonedVehicleIntentHandler.canHandle(handlerInput)).toBe(false);
  });

  // Add more test cases for different scenarios in the handle function
  // For example: test cases for when there is no confirmed phone number, when timePeriod slot has value,
  // when licensePlate slot has value, when make, model and color slots have values, and when one or more of the make, model, and color slots are empty
// Continuing from the previous test cases, add the following test cases:

test('handle delegates to GetPhoneNumberIntent when there is no confirmed phone number', async () => {
  handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ confirmedPhoneNumber: false });

  const response = await InProgressAbandonedVehicleIntentHandler.handle(handlerInput);

  expect(response).toBeDefined();
  expect(response.directives).toBeDefined();
  expect(response.directives[0].type).toBe('Dialog.Delegate');
  expect(response.directives[0].updatedIntent.name).toBe('GetPhoneNumberIntent');
});

test('handle sends a progressive response and delegates when timePeriod slot has value', async () => {
  handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ confirmedPhoneNumber: true });
  handlerInput.requestEnvelope.request.intent.slots.timePeriod.value = '1 day';

  helper.sendProgressiveResponse.mockResolvedValue();

  const response = await InProgressAbandonedVehicleIntentHandler.handle(handlerInput);

  expect(helper.sendProgressiveResponse).toHaveBeenCalled();
  expect(response).toBeDefined();
  expect(response.directives).toBeDefined();
  expect(response.directives[0].type).toBe('Dialog.Delegate');
});

test('handle asks for confirmation when licensePlate slot has value', async () => {
  handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ confirmedPhoneNumber: true });
  handlerInput.requestEnvelope.request.intent.slots.licensePlate.value = 'FOR';

  const response = await InProgressAbandonedVehicleIntentHandler.handle(handlerInput);

  expect(response).toBeDefined();
  expect(response.outputSpeech).toBeDefined();
  expect(response.outputSpeech.ssml).toContain('Just to confirm, did you say the license plate number is');
});

test('handle asks for confirmation when make, model, and color slots have values', async () => {
  handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ confirmedPhoneNumber: true });
  handlerInput.requestEnvelope.request.intent.slots.make.value = 'Toyota';
  handlerInput.requestEnvelope.request.intent.slots.model.value = 'Camry';
  handlerInput.requestEnvelope.request.intent.slots.color.value = 'red';

  const response = await InProgressAbandonedVehicleIntentHandler.handle(handlerInput);

  expect(response).toBeDefined();
  expect(response.outputSpeech).toBeDefined();
  expect(response.outputSpeech.ssml).toContain('Just to confirm, did you say the vehicle is a red Toyota Camry?');
});

test('handle elicits slot when coloring is missing', async () => {
  handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ confirmedPhoneNumber: true });
  handlerInput.requestEnvelope.request.intent.slots.make.value = 'Toyota';
  handlerInput.requestEnvelope.request.intent.slots.model.value = 'Camry';
  

  const response = await InProgressAbandonedVehicleIntentHandler.handle(handlerInput);

  expect(response).toBeDefined();
  expect(response.directives).toBeDefined();
  expect(response.directives[0].type).toBe('Dialog.ElicitSlot');
  expect(response.directives[0].slotToElicit).toBe('color');
  expect(response.outputSpeech).toBeDefined();
  expect(response.outputSpeech.ssml).toContain('What is the color of the vehicle?');
});
test('handle elicits slot when make is missing', async () => {
  handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ confirmedPhoneNumber: true });
  handlerInput.requestEnvelope.request.intent.slots.color.value = 'blue';
  handlerInput.requestEnvelope.request.intent.slots.model.value = 'Camry';
  

  

  const response = await InProgressAbandonedVehicleIntentHandler.handle(handlerInput);

  expect(response).toBeDefined();
  expect(response.directives).toBeDefined();
  expect(response.directives[0].type).toBe('Dialog.ElicitSlot');
  expect(response.directives[0].slotToElicit).toBe('make');
  expect(response.outputSpeech).toBeDefined();
  expect(response.outputSpeech.ssml).toContain('What is the make model and color of the vehicle?');
});
test('handle elicits slot when cmodel is missing', async () => {
  handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ confirmedPhoneNumber: true });
  handlerInput.requestEnvelope.request.intent.slots.make.value = 'Toyota';
  handlerInput.requestEnvelope.request.intent.slots.color.value = 'blue';
  

  const response = await InProgressAbandonedVehicleIntentHandler.handle(handlerInput);

  expect(response).toBeDefined();
  expect(response.directives).toBeDefined();
  expect(response.directives[0].type).toBe('Dialog.ElicitSlot');
  expect(response.directives[0].slotToElicit).toBe('model');
  expect(response.outputSpeech).toBeDefined();
  expect(response.outputSpeech.ssml).toContain('What is the model of the vehicle?');
});
});
  
describe("CompletedAbandonedVehicleIntentHandler", () => {
    test("canHandle returns true for CompletedAbandonedVehicleIntentHandler", () => {
        const handlerInput = {
          requestEnvelope: {
            request: {
              type: "IntentRequest",
              intent: {
                name: "AbandonedVehicleIntent",
              },
              dialogState: "COMPLETED",
            },
          },
        };
      
        expect(CompletedAbandonedVehicleIntentHandler.canHandle(handlerInput)).toBe(true);
      });
      test("Handles a generic case with an unvalidated location or outside the city", async () => {
        const handlerInput = {
          requestEnvelope: {
            request: {
              type: "IntentRequest",
              intent: {
                name: "AbandonedVehicleIntent",
                slots: {
                  make: { value: "Toyota" },
                  model: { value: "Camry" },
                  color: { value: "blue" },
                  licensePlate: { value: "AB1234" },
                  timePeriod: { value: "1" },
                },
              },
              dialogState: "COMPLETED",
            },
          },
          attributesManager: {
            getSessionAttributes: () => ({
              confirmedPhoneNumber: "123-456-7890",
              confirmedValidatorRes: {
                Validated: false,
                Within_City: false,
                Address: "123 Main St",
              },
            }),
          },
          responseBuilder: Alexa.ResponseFactory.init(),
          t: jest.fn((key) => key),
        };
      
        // Mock helper functions used in the handler
        helper.createGenericCase = jest.fn().mockResolvedValue({ case_id: "12345" });
        helper.updateGenericCase = jest.fn().mockResolvedValue({});
      
        const response = await CompletedAbandonedVehicleIntentHandler.handle(handlerInput);
        expect(response.outputSpeech.ssml).toContain("Thank you for reporting the abandoned vehicle. Your case will be reviewed by a service agent. Is there anything else I can help you with?");
      });
      test("Handles an integrated case with a validated location within the city", async () => {
            const handlerInput = {
                    requestEnvelope: {
                        request: {
                        type: "IntentRequest",
                        intent: {
                            name: "AbandonedVehicleIntent",
                            slots: {
                            make: { value: "Toyota" },
                            model: { value: "Camry" },
                            color: { value: "blue" },
                            licensePlate: { value: "AB1234" },
                            timePeriod: { value: "P2D" },
                            },
                        },
                        dialogState: "COMPLETED",
                        },
                    },
                    attributesManager: {
                        getSessionAttributes: () => ({
                        confirmedPhoneNumber: "123-456-7890",
                        confirmedValidatorRes: {
                            Validated: true,
                            Within_City: true,
                            Address: "123 Main St",
                        },
                        AbandonedVehicleIntent: {
                            name: "AbandonedVehicleIntent",
                        },
                        
                        questionAsked: 'AnythingElse?'
                        }),
                    },
                    responseBuilder: Alexa.ResponseFactory.init(),
                    t: jest.fn((key) => key),
                    };
                
                
                    // Mock helper functions used in the handler
                    helper.getOAuthToken = jest.fn().mockResolvedValue("some_token");
                    helper.openIntegratedCase = jest.fn().mockResolvedValue({ case_id: "12345" });
                    helper.updateIntegratedCase = jest.fn().mockResolvedValue({});
                    helper.setQuestion = jest.fn()
                   
                    const response = await CompletedAbandonedVehicleIntentHandler.handle(handlerInput);
                    
                    expect(response.outputSpeech.ssml).toContain("<speak>ABANDONED_VEHICLE_THANKS</speak>");
              
        
        });  

    });

    
    describe('yn_IsAbandonedVehicleIntentHandler', () => {
      let handlerInput;
    
      beforeEach(() => {
        handlerInput = {
          requestEnvelope: {
            request: {
              type: 'IntentRequest',
              intent: {},
            },
          },
          attributesManager: {
            getSessionAttributes: jest.fn(),
            setSessionAttributes: jest.fn(),
          },
          responseBuilder: Alexa.ResponseFactory.init(),
          t: jest.fn((key) => key),
        };

      });
    
      describe('canHandle', () => {
        it('returns true when the correct conditions are met', () => {
          handlerInput.requestEnvelope.request.intent.name = 'AMAZON.YesIntent';
          handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsAbandonedVehicleCorrect?' });
    
          expect(yn_IsAbandonedVehicleIntentHandler.canHandle(handlerInput)).toBe(true);
        });
    
        it('returns false when the conditions are not met', () => {
          handlerInput.requestEnvelope.request.intent.name = 'AMAZON.StopIntent';
          handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsAbandonedVehicleCorrect?' });
    
          expect(yn_IsAbandonedVehicleIntentHandler.canHandle(handlerInput)).toBe(false);
        });
      });
    
      describe('handle', () => {
        it('handles AMAZON.YesIntent when geolocation is supported', async () => {
          helper.isGeolocationAvailable = jest.fn().mockReturnValue('supported');
          handlerInput.requestEnvelope.request.intent.name = 'AMAZON.YesIntent';
          handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsAbandonedVehicleCorrect?' });
    
          const response = yn_IsAbandonedVehicleIntentHandler.handle(handlerInput);
    
          expect(response.outputSpeech.ssml).toContain("Alright. Would you like to use your current location as the location of the abandoned vehicle?");
        });
    
        it('handles AMAZON.YesIntent when geolocation is not supported', async () => {
          helper.isGeolocationAvailable = jest.fn().mockReturnValue('unsupported');
          handlerInput.requestEnvelope.request.intent.name = 'AMAZON.YesIntent';
          handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsAbandonedVehicleCorrect?' });
    
          const response = yn_IsAbandonedVehicleIntentHandler.handle(handlerInput);
    
          expect(response.outputSpeech.ssml).toContain("Alright. Where is the abandoned vehicle located?");
          expect(response.directives[0].type).toBe('Dialog.ElicitSlot');
          expect(response.directives[0].slotToElicit).toBe('userGivenAddress');
        });
        it('handles AMAZON.YesIntent if allready has collected location', async () => {
          helper.isGeolocationAvailable = jest.fn().mockReturnValue('unsupported');
          handlerInput.requestEnvelope.request.intent.name = 'AMAZON.YesIntent';
          handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsAbandonedVehicleCorrect?',confirmedValidatorRes: {Validated: true, Within_City: true, Address: "123 Main St"}});

          const response = yn_IsAbandonedVehicleIntentHandler.handle(handlerInput);
          expect(response.directives[0].type).toBe('Dialog.Delegate');
        });
        it('handles AMAZON.NoIntent', async () => {
          handlerInput.requestEnvelope.request.intent.name = 'AMAZON.NoIntent';
          handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsAbandonedVehicleCorrect?' });
    
          const response = yn_IsAbandonedVehicleIntentHandler.handle(handlerInput);
    
          expect(response.outputSpeech.ssml).toContain("UNKNOWN_MSG");
          expect(response.reprompt.outputSpeech.ssml).toContain("UNKNOWN_MSG_REPROMPT");
          expect(response.shouldEndSession).toBe(false);
        });
      });
    });
    describe('yn_ConfirmVehicleDescriptionIntentHandler', () => {
      let handlerInput;
    
      beforeEach(() => {
        handlerInput = {
          attributesManager: {
            getSessionAttributes: jest.fn(),
            setSessionAttributes: jest.fn(),
          },
          requestEnvelope: {
            request: {
              type: 'IntentRequest',
              intent: {
                name: 'AMAZON.YesIntent',
                confirmationStatus: 'NONE',
                slots: {},
              },
            },
          },
          responseBuilder: Alexa.ResponseFactory.init(),
        };
        handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
          questionAsked: 'IsVehicleDescriptionCorrect?',
          failCounter: 0,
        });
      });
    
      test('canHandle returns true when the intent is AMAZON.YesIntent or AMAZON.NoIntent, questionAsked is IsVehicleDescriptionCorrect? and failCounter is less than 3', () => {
        expect(yn_ConfirmVehicleDescriptionIntentHandler.canHandle(handlerInput)).toBe(true);
    
        handlerInput.requestEnvelope.request.intent.name = 'AMAZON.NoIntent';
        expect(yn_ConfirmVehicleDescriptionIntentHandler.canHandle(handlerInput)).toBe(true);
      });
    
      test('canHandle returns false when the intent is not AMAZON.YesIntent or AMAZON.NoIntent', () => {
        handlerInput.requestEnvelope.request.intent.name = 'SomeOtherIntent';
        expect(yn_ConfirmVehicleDescriptionIntentHandler.canHandle(handlerInput)).toBe(false);
      });
    
      test('canHandle returns false when questionAsked is not IsVehicleDescriptionCorrect?', () => {
        handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'SomeOtherQuestion' });
        expect(yn_ConfirmVehicleDescriptionIntentHandler.canHandle(handlerInput)).toBe(false);
      });
    
      test('canHandle returns false when failCounter is 3 or more', () => {
        handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsVehicleDescriptionCorrect?', failCounter: 3 });
        expect(yn_ConfirmVehicleDescriptionIntentHandler.canHandle(handlerInput)).toBe(false);
      });
    
      // Add test cases for the handle function
      test('handle elicits licensePlate slot when AMAZON.YesIntent is received', async () => {
        helper.sendProgressiveResponse.mockResolvedValue();
    
        const response = await yn_ConfirmVehicleDescriptionIntentHandler.handle(handlerInput);
    
        expect(helper.clearFailCounter).toHaveBeenCalled();
        expect(helper.sendProgressiveResponse).toHaveBeenCalled();
        expect(response).toBeDefined();
        expect(response.directives).toBeDefined();
        expect(response.directives[0].type).toBe('Dialog.ElicitSlot');
        expect(response.directives[0].slotToElicit).toBe('licensePlate');
      });
    
      test('handle retries when AMAZON.NoIntent is received and failCounter is less than 2', async () => {
        handlerInput.requestEnvelope.request.intent.name = 'AMAZON.NoIntent';
    
        const response = await yn_ConfirmVehicleDescriptionIntentHandler.handle(handlerInput);
    
        expect(helper.incFailCounter).toHaveBeenCalled();
        expect(response).toBeDefined();
        expect(response.directives).toBeDefined();
        expect(response.directives[0].type).toBe('Dialog.ElicitSlot');
        expect(response.directives[0].slotToElicit).toBe('make');

        expect(response.outputSpeech).toBeDefined();
        expect(response.outputSpeech.ssml).toContain("I'm sorry about that, let's try again. What is the make of the vehicle?");
});

test('handle transfers to a live agent when AMAZON.NoIntent is received and failCounter is 2', async () => {
  handlerInput.requestEnvelope.request.intent.name = 'AMAZON.NoIntent';
  handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsVehicleDescriptionCorrect?', failCounter: 2 });
  const response = await yn_ConfirmVehicleDescriptionIntentHandler.handle(handlerInput);

  expect(response).toBeDefined();
  expect(response.outputSpeech).toBeDefined();
  expect(response.shouldEndSession).toBe(true);
  expect(response.outputSpeech.ssml).toContain('I\'m sorry, I can\'t seem to help you with this. I\'m transferring you to a live agent who can assist you. Please hold while I transfer you.');
  });
});  
describe('yn_ConfirmLicensePlateIntentHandler', () => {
  let handlerInput;

  beforeEach(() => {
    handlerInput = {
      attributesManager: {
        getSessionAttributes: jest.fn(),
        setSessionAttributes: jest.fn(),
      },
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'AMAZON.YesIntent',
            confirmationStatus: 'NONE',
            slots: {},
          },
        },
      },
      responseBuilder: Alexa.ResponseFactory.init(),
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'IsLicensePlateCorrect?',
      failCounter: 0,
      AbandonedVehicleIntent: {
        confirmationStatus: 'NONE',
      },
    });
  });

  test('canHandle returns true when the intent is AMAZON.YesIntent or AMAZON.NoIntent, questionAsked is IsLicensePlateCorrect? and failCounter is less than 3', () => {
    expect(yn_ConfirmLicensePlateIntentHandler.canHandle(handlerInput)).toBe(true);

    handlerInput.requestEnvelope.request.intent.name = 'AMAZON.NoIntent';
    expect(yn_ConfirmLicensePlateIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  test('canHandle returns false when the intent is not AMAZON.YesIntent or AMAZON.NoIntent', () => {
    handlerInput.requestEnvelope.request.intent.name = 'SomeOtherIntent';
    expect(yn_ConfirmLicensePlateIntentHandler.canHandle(handlerInput)).toBe(false);
  });

  test('canHandle returns false when questionAsked is not IsLicensePlateCorrect?', () => {
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'SomeOtherQuestion' });
    expect(yn_ConfirmLicensePlateIntentHandler.canHandle(handlerInput)).toBe(false);
  });

  test('canHandle returns false when failCounter is 3 or more', () => {
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsLicensePlateCorrect?', failCounter: 3 });
    expect(yn_ConfirmLicensePlateIntentHandler.canHandle(handlerInput)).toBe(false);
  });
  
  test('canHandle returns false when failCounter is 2 or less', () => {
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsLicensePlateCorrect?', failCounter: 2 });
    expect(yn_ConfirmLicensePlateIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  // Add test cases for the handle function
  test('handle elicits timePeriod slot when AMAZON.YesIntent is received', () => {
    const response = yn_ConfirmLicensePlateIntentHandler.handle(handlerInput);
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ confirmationStatus: 'CONFIRMED' });
    expect(helper.clearFailCounter).toHaveBeenCalled();
    expect(response).toBeDefined();
    expect(response.directives).toBeDefined();
    expect(response.directives[0].type).toBe('Dialog.ElicitSlot');
    expect(response.directives[0].slotToElicit).toBe('timePeriod');
  });

  test('handle retries when AMAZON.NoIntent is received and failCounter is less than 2', () => {
    handlerInput.requestEnvelope.request.intent.name = 'AMAZON.NoIntent';

    const response = yn_ConfirmLicensePlateIntentHandler.handle(handlerInput);

    expect(helper.incFailCounter).toHaveBeenCalled();
    expect(response).toBeDefined();
    expect(response.directives).toBeDefined();
    expect(response.directives[0].type).toBe('Dialog.ElicitSlot');
    expect(response.directives[0].slotToElicit).toBe('licensePlate');
  });

  test('handle requests for a detailed description when AMAZON.No Intent is received and failCounter is 2', () => {
    handlerInput.requestEnvelope.request.intent.name = 'AMAZON.NoIntent';
handlerInput.attributesManager.getSessionAttributes.mockReturnValue({ questionAsked: 'IsLicensePlateCorrect?', failCounter: 2, confirmationStatus: 'NONE'});
const response = yn_ConfirmLicensePlateIntentHandler.handle(handlerInput);

expect(response).toBeDefined();
expect(response.outputSpeech).toBeDefined();
expect(response.shouldEndSession).toBe(true);
expect(response.outputSpeech.ssml).toContain('I\'m having trouble gathering the information. Can you describe the issue in detail for your case to be reviewed by a service agent?');
  });
});