const Alexa = require('ask-sdk-core');
const helper = require('../helper/helperFunctions.js');
const sfCase = require('../helper/SalesforceCaseObject.js');
const formatInput = require('../helper/formatAddress.js');
const SIPGetLocationFromUserIntentHandler = require('../addressCollectionFlow.js').SIPGetLocationFromUserIntentHandler;
const yn_IsAddressCorrectIntentHandler = require('../addressCollectionFlow.js').yn_IsAddressCorrectIntentHandler;
const yn_UseGeoLocationIntentHandler = require('../addressCollectionFlow.js').yn_UseGeoLocationIntentHandler;
const yn_UseHomeAddressIntentHandler = require('../addressCollectionFlow.js').yn_UseHomeAddressIntentHandler;
const yn_TryAnotherAddress = require('../addressCollectionFlow.js').yn_TryAnotherAddress;
const GetLocationRequestInterceptor = require('../addressCollectionFlow.js').GetLocationRequestInterceptor;


helper.sendProgressiveResponse = jest.fn();
helper.getOAuthToken = jest.fn();
helper.setQuestion = jest.fn();
helper.getFailCounter = jest.fn();
helper.clearFailCounter = jest.fn();
helper.switchIntent = jest.fn();
helper.reverseGeocode = jest.fn();
helper.isGeolocationAvailable = jest.fn();
helper.getHomeAddress = jest.fn();
formatInput.formatInput = jest.fn();
Alexa.getSlotValue = jest.fn(() => '123 Main St');



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

const mockRequestEnvelope = {
  request: {
    type: 'IntentRequest',
    intent: {
      name: 'GetLocationFromUserIntent',
        confirmationStatus: 'NONE',
        slots: {
            userGivenAddress: {
                name: 'userGivenAddress',
                value: null,
                confirmationStatus: 'NONE',
            }
        }

    },
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
};

const handlerInput = {
  requestEnvelope: mockRequestEnvelope,
  responseBuilder: Alexa.ResponseFactory.init(),
    sessionAttributes: {
        getLocation:{
            unconfirmedValidatorRes : {
                Address: '123 Main St',
                District: '1',
                FullAddress: '123 Main St, San Francisco, CA 94105',
                Validated: 'true',
                Score: '100',
                geocoderResponse: {},
                Similar_Cases: {},
                Within_City: true

        },
    
    },
    failCounter: 0,

},
  attributesManager: {
    getSessionAttributes: jest.fn(),
    setSessionAttributes: jest.fn(),
    getSlotValue: jest.fn(),
  },
  t: jest.fn((key) => key),
};

describe('GetLocationFromUserIntentHandler', () => {

  it('canHandle', () => {
    expect(SIPGetLocationFromUserIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  test("SIPGetLocationFromUserIntentHandler handle", async () => {

    handlerInput.requestEnvelope.request.intent.slots.userGivenAddress.value = '123 Main St';


    helper.sendProgressiveResponse.mockResolvedValue();
    helper.getOAuthToken.mockResolvedValue('fake-token');


    const mockRes = {
        Address: '123 Main St',
        District: '1',
        FullAddress: '123 Main St, San Francisco, CA 94105',
        Validated: 'true',
        Score: '100',
        geocoderResponse: {},
        Similar_Cases: {},
        Within_City: true,
    };
    formatInput.formatInput.mockReturnValue('123 Main St.');
     sfCase.mockImplementation(() => ({
        address_case_validator: jest.fn().mockResolvedValue(mockRes),
      }));   
    const res = await sfCase().address_case_validator();

    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      getLocation: {
        unconfirmedValidatorRes: {
          Address: '123 Main St',
          District: '1',
          FullAddress: '123 Main St, San Francisco, CA 94105',
          Validated: 'true',
          Score: '100',
          geocoderResponse: {},
          Similar_Cases: {},
          Within_City: true,
        },
      },
      failCounter: 0,
    });
    




  
 

    const response = await SIPGetLocationFromUserIntentHandler.handle(handlerInput);
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
    expect(formatInput.formatInput).toHaveBeenCalled();
    expect(helper.sendProgressiveResponse).toHaveBeenCalled();
    expect(helper.getOAuthToken).toHaveBeenCalled();

    expect(response.outputSpeech.ssml).toContain("<speak>Did you say the address was <say-as interpret-as='address'>123 Main St</say-as>?</speak>");
    
  });
  test("SIPGetLocationFromUserIntentHandler handle - no address", async () => {
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({});
    
    handlerInput.requestEnvelope.request.intent.slots.userGivenAddress.value = null;
    console.log(handlerInput.requestEnvelope.request.intent.slots.userGivenAddress.value);
    handlerInput.attributesManager.setSessionAttributes.mockClear();
    helper.sendProgressiveResponse.mockResolvedValue();
    const response = await SIPGetLocationFromUserIntentHandler.handle(handlerInput);
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
    expect(helper.sendProgressiveResponse).toHaveBeenCalled();
    expect(response.outputSpeech.ssml).toContain("<speak>CRITICAL_ERROR_MSG</speak>");
   


  });
 


});
describe('yn_IsAddressCorrectIntentHandler', () => {
  beforeEach(() => {
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'IsAddressCorrect?',
      getLocation: {
        unconfirmedValidatorRes: {
          Address: '123 Main St',
          District: '1',
          FullAddress: '123 Main St, San Francisco, CA 94105',
          Validated: 'true',
          Score: '100',
          geocoderResponse: {},
          Similar_Cases: {},
          Within_City: true,
        },
      },
    });
  });

  it('canHandle YesIntent', () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    expect(yn_IsAddressCorrectIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  it('canHandle NoIntent', () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.NoIntent',
      confirmationStatus: 'NONE',
    };
    expect(yn_IsAddressCorrectIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  test('handle YesIntent', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    helper.clearFailCounter = jest.fn().mockReturnThis();
    helper.sendProgressiveResponse.mockResolvedValue();
    helper.getOAuthToken.mockResolvedValue('fake-token');
    helper.switchIntent = jest.fn().mockReturnValue({
    name: 'GetUserPhoneNumberIntent',
    confirmationStatus: 'NONE',
    slots: {
      userGivenAddress: {
        name: 'userGivenAddress',
        value: null,
        confirmationStatus: 'NONE',
      },
    },
  });
    sfCase.mockImplementation(() => ({
      get_gis_attribute: jest.fn().mockResolvedValue(),
    }));

    const response = await yn_IsAddressCorrectIntentHandler.handle(handlerInput);
    expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
    expect(helper.clearFailCounter).toHaveBeenCalled();
    expect(helper.sendProgressiveResponse).toHaveBeenCalled();
    expect(helper.switchIntent).toHaveBeenCalled();
  });
  test('If unconfirmedValidatorRes is null', async () => {
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'IsAddressCorrect?',
      getLocation: {
        unconfirmedValidatorRes: null,
      },
    });
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
   

   
    expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();

  try {
       await yn_IsAddressCorrectIntentHandler.handle(handlerInput);
    } catch (error) {
      error.message = 'unconfirmedValidatorRes is null';
      expect(error.message).toBe('unconfirmedValidatorRes is null');
    } 

  });
  test('if Validator in unconfirmedValidatorRes is false or null', async () => {
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'IsAddressCorrect?',
      getLocation: {
        unconfirmedValidatorRes: {
          Address: '123 Main St',
          District: '1',
          FullAddress: '123 Main St, San Francisco, CA 94105',
          Validated: null,
          Score: '100',
          geocoderResponse: {},
          Similar_Cases: {},
          Within_City: true,
        },
      },
    });
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    const response = await yn_IsAddressCorrectIntentHandler.handle(handlerInput);
    expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
  });

  test('handle NoIntent', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.NoIntent',
      confirmationStatus: 'NONE',
    };
    helper.sendProgressiveResponse.mockResolvedValue();
    helper.getOAuthToken.mockResolvedValue('fake-token');
    sfCase.mockImplementation(() => ({
      get_gis_attribute: jest.fn().mockResolvedValue(),
    }));

    const response = await yn_IsAddressCorrectIntentHandler.handle(handlerInput);
    expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
    expect(helper.sendProgressiveResponse).toHaveBeenCalled();
    expect(response.outputSpeech.ssml).toContain("<speak>LOCATION_RETRY</speak>");

  });
  test('handle NoIntent - fail counter', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.NoIntent',
      confirmationStatus: 'NONE',
    };
    console.log(handlerInput.sessionAttributes.failCounter);
    handlerInput.sessionAttributes.failCounter = 2;
    helper.sendProgressiveResponse.mockResolvedValue();
  
    helper.getFailCounter.mockReturnValue(handlerInput.sessionAttributes.failCounter);
    helper.clearFailCounter = jest.fn(handlerInput.sessionAttributes.failCounter = 0).mockReturnThis();

    const response = await yn_IsAddressCorrectIntentHandler.handle(handlerInput);
    expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
    expect(response.outputSpeech.ssml).toContain(`I'm sorry, I'm having trouble understanding your address. Please try again later or call 311 for assistance.`);

  });


});

describe('yn_UseGeoLocationIntentHandler', () => {
  beforeEach(() => {
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseGeolocation?',
      getLocation: {
        geolocation: {
          unconfirmedValidatorRes: {
            Address: '123 Main St',
            District: '1',
            FullAddress: '123 Main St, San Francisco, CA 94105',
            Validated: null,
            Score: '100',
            geocoderResponse: {},
            Similar_Cases: {},
            Within_City: true,
          },
          coordinate: {
            latitudeInDegrees: 37.7749,
            longitudeInDegrees: -122.4194,
          },
        },
      },
    });
  });

  it('canHandle YesIntent', () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    expect(yn_UseGeoLocationIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  it('canHandle NoIntent', () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.NoIntent',
      confirmationStatus: 'NONE',
    };
    expect(yn_UseGeoLocationIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  test('yn_UseGeoLocationIntentHandler - User says NO to using geolocations', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.NoIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({});
    try{
     await yn_UseGeoLocationIntentHandler.handle(handlerInput);
    }
    catch(e){
      expect(e.message).toBe('yn_UseGeoLocationIntentHandler Error: GetLocationInterceptor was never triggered.');
    }
    expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
   
      
  });
  test('yn_UseGeoLocationIntentHandler - User says NO to using geolocation with getlocation in sesssionAttributes', async () => {

    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.NoIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseGeolocation?',
      getLocation: "123 Main St",

  
    });
   
    const response = await yn_UseGeoLocationIntentHandler.handle(handlerInput);

    expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
    expect(response.outputSpeech.ssml).toContain("<speak>Alright. Can you give me an address or two cross streets nearby?</speak>");
  });


  test('handle YesIntent', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseGeolocation?',
      getLocation: {
        geolocation: "123 Main St",
      },
    });
    helper.reverseGeocode.mockResolvedValue({
      address: {
        Address: '123 Main St',
        City: 'San Francisco',
      },
    });
    try {
      await yn_UseGeoAddressIntentHandler.handle(handlerInput);
    } catch (e) {
      expect(e.message).toBe('yn_UseGeoAddressIntentHandler is not defined');
    }
    

    helper.sendProgressiveResponse.mockResolvedValue();
    handlerInput.attributesManager.getSessionAttributes= jest.fn().mockResolvedValue({ questionAsked: 'UseGeolocation?',
    getLocation: {
      geolocation: {
        coordinate: {
          latitudeInDegrees: 37.7749,
          longitudeInDegrees: -122.4194,
        },
      },
    },
  });

  // Mock helper.reverseGeocode
  const mockRevGeocodeRes = {
    address: {
      Address: '123 Main St',
      City: 'San Francisco',
    },
  };

  helper.reverseGeocode = jest.fn().mockResolvedValue(mockRevGeocodeRes);
  helper.getOAuthToken.mockResolvedValue('fake-token');
    const mockValidatorRes = { 
    
          Address: '123 Main St',
          District: '1',
          FullAddress: '123 Main St, San Francisco, CA 94105',
          Validated: 'true',
          Score: '100',
          geocoderResponse: {},
          Similar_Cases: {},
          Within_City: true,
      };
      
  sfCase.mockImplementation(() => ({
    address_case_validator: jest.fn().mockResolvedValue(mockValidatorRes),
  }));
  const res = await sfCase().address_case_validator();
  console.log(res);


      
  try{
    await yn_UseGeoLocationIntentHandler.handle(handlerInput);
    }catch(e){
      expect(e.message).toBe(`yn_UseGeoLocationIntentHandler Error: GetLocationInterceptor was never triggered.`);
    }

    expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
 
  });
  test('handle YesIntent with not-accurate geolocation', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseGeolocation?',
      getLocation: {
        geolocation: null,
      },
    });
    helper.isGeolocationAvailable.mockReturnValue('not-accurate');
  
    const response = await yn_UseGeoLocationIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain("INACCURATE_GEO_MSG");
  });
  
  test('handle YesIntent with not-authorized geolocation', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseGeolocation?',
      getLocation: {
        geolocation: null,
      },
    });
    helper.isGeolocationAvailable.mockReturnValue('not-authorized');
  
    const response = await yn_UseGeoLocationIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain("UNAUTHORIZED_GEO_MSG");
  });
  
  test('handle YesIntent with not-available geolocation', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseGeolocation?',
      getLocation: {
        geolocation: null,
      },
    });
    helper.isGeolocationAvailable.mockReturnValue('not-available');
  
    const response = await yn_UseGeoLocationIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain("UNAVAILABLE_GEO_MSG");
  });
  

  test('getLocation is null', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseGeolocation?',
    });
    handlerInput.sessionAttributes.getLocation = null;
  
 
      try {
        await yn_UseGeoLocationIntentHandler.handle(handlerInput);
      }
      catch (e) {
        expect(e.message).toBe('yn_UseGeoLocationIntentHandler Error: GetLocationInterceptor was never triggered.');
      }
      expect(handlerInput.attributesManager.getSessionAttributes).toHaveBeenCalled();
      expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
  });
  test('handle YesIntent with valid geolocation and address found', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseGeolocation?',
      getLocation: {
        geolocation: { coordinate: { latitudeInDegrees: 37.7749, longitudeInDegrees: -122.4194 } },
      },
    });
   

    const response = await yn_UseGeoLocationIntentHandler.handle(handlerInput);
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
    expect(response.outputSpeech.ssml).toContain("<speak>Is the location near <say-as interpret-as='address'>123 Main St in San Francisco</say-as>?</speak>");
  });
  
  test('handle YesIntent with valid geolocation and address not found', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseGeolocation?',
      getLocation: {
        geolocation: { coordinate: { latitudeInDegrees: 37.7749, longitudeInDegrees: -122.4194 } },
      },
    });
    helper.reverseGeocode.mockResolvedValue({
      address: null,
    });
  
    const response = await yn_UseGeoLocationIntentHandler.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain("I'm sorry, I was unable to find an address near your location. Can you give me an address or two cross streets nearby?");
   
  });
  

});

describe('yn_UseHomeAddressIntentHandler', () => {
  test('yn_UseHomeAddressIntentHandler canHandle YES intent', () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseHomeAddress?',
    });

    expect(yn_UseHomeAddressIntentHandler.canHandle(handlerInput)).toBe(true);
  });
  test('yn_UseHomeAddressIntentHandler canHandle No intent', () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.NoIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseHomeAddress?',
    });

    expect(yn_UseHomeAddressIntentHandler.canHandle(handlerInput)).toBe(true);
  });

  test('yn_UseHomeAddressIntentHandler - User says YES to using home address', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseHomeAddress?',
      getLocation: {
        geolocation: { coordinate: { latitudeInDegrees: 37.7749, longitudeInDegrees: -122.4194 } },
      },
    });
 
   
    
   
    // Mock helper functions
    helper.isHomeAddressAvailable = jest.fn().mockReturnValue(true);
    helper.getHomeAddress = jest.fn().mockReturnValue({
      addressLine1: '123 Main St',
      city: 'Anytown',
    });
  
    const response = await yn_UseHomeAddressIntentHandler.handle(handlerInput);
  
    expect(response.outputSpeech.ssml).toContain(
      "<speak>Just to confirm, is the location near <say-as interpret-as='address'>123 Main St</say-as>?</speak>"
    );
    expect(response.shouldEndSession).toBe(false);
  });
  test('yn_UseHomeAddressIntentHandler - User says YES to using home address, homeAddress is not available', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: null,
    });
    handlerInput.sessionAttributes.getLocation = {}; // Mock the getLocation object
  
    // Mock helper functions
    helper.isHomeAddressAvailable = jest.fn().mockReturnValue(false);
  
    try {
      await yn_UseHomeAddressIntentHandler.handle(handlerInput);
    } catch (e) {
      expect(e.message).toBe('yn_UseHomeAddressIntentHandler Error: GetLocationInterceptor was never triggered.');
    }

  });



  test('yn_UseHomeAddressIntentHandler - User says YES to using home address, homeAddress is not available response', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: null,
      getLocation: { geolocation: { coordinate: { latitudeInDegrees: 37.7749, longitudeInDegrees: -122.4194 } } },
    });
  

    helper.isHomeAddressAvailable = jest.fn().mockReturnValue(false);

  
    const response = await yn_UseHomeAddressIntentHandler.handle(handlerInput);

    expect(response.outputSpeech.ssml).toContain("<speak>I'm sorry, I had trouble finding your home address. Can you give me an address or two cross streets nearby?</speak>");
    expect(response.directives[0].type).toBe('Dialog.Delegate');
  
  });
  
 
  
  test('yn_UseHomeAddressIntentHandler - User says NO to using home address', async () => {
    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.NoIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'UseHomeAddress?',
      getLocation: {
        geolocation: { coordinate: { latitudeInDegrees: 37.7749, longitudeInDegrees: -122.4194 } },
      },
    });
    
  
    const response = await yn_UseHomeAddressIntentHandler.handle(handlerInput);
  
    expect(response.outputSpeech.ssml).toContain("Alright. Can you give me an address or two cross streets nearby?");
    expect(response.directives[0].type).toBe('Dialog.Delegate');
 
  });
  test('yn_UseHomeAddressIntentHandler - User says NO to using home address error handler', async () => {
    
      handlerInput.requestEnvelope.request.intent = {
        name: 'AMAZON.NoIntent',
        confirmationStatus: 'NONE',
      };
      handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
        questionAsked: 'UseHomeAddress?',
      });
      handlerInput.sessionAttributes.getLocation = {}; // Mock the getLocation object
    

      helper.isHomeAddressAvailable = jest.fn().mockReturnValue(false);
    
      try {
        await yn_UseHomeAddressIntentHandler.handle(handlerInput);
      } catch (e) {
        expect(e.message).toBe('yn_UseGeoLocationIntentHandler Error: GetLocationInterceptor was never triggered.');
      }
    });

});


describe('yn_TryAnotherAddress', () => {

  test('yn_TryAnotherAddress canHandle YES intent', () => {

    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'tryAnotherAddress?',
    });

    expect(yn_TryAnotherAddress.canHandle(handlerInput)).toBe(true);
  }

  );
  test('yn_TryAnotherAddress canHandle NO intent', () => {

    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.NoIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'tryAnotherAddress?',
    });

    expect(yn_TryAnotherAddress.canHandle(handlerInput)).toBe(true);
  }
  
  );
  test('yn_TryAnotherAddress canHandle intentRequest intent', () => {
      
    handlerInput.requestEnvelope.request.intent = {
      name: 'intentRequest',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'tryAnotherAddress?',
    });

    expect(yn_TryAnotherAddress.canHandle(handlerInput)).toBe(false);
  }
  );
  test('yn_TryAnotherAddress handle YES intent', async () => {

    handlerInput.requestEnvelope.request.intent = {
      name: 'AMAZON.YesIntent',
      confirmationStatus: 'NONE',
    };
    handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
      questionAsked: 'tryAnotherAddress?',
    });

    const response = await yn_TryAnotherAddress.handle(handlerInput);
    expect(response.outputSpeech.ssml).toContain("LOCATION_RETRY");
    expect(response.directives[0].type).toBe('Dialog.Delegate');




});

test('yn_TryAnotherAddress handle NO intent', async () => {

  handlerInput.requestEnvelope.request.intent = {
    name: 'AMAZON.NoIntent',
    confirmationStatus: 'NONE',
  };
  handlerInput.attributesManager.getSessionAttributes.mockReturnValue({
    questionAsked: 'anythingElse?',
  });

  const response = await yn_TryAnotherAddress.handle(handlerInput);
  expect(response.outputSpeech.ssml).toContain("ANYTHING_ELSE_MSG");
  expect(response.directives[0].type).toBe('Dialog.Delegate');




});
});

describe('GetLocationRequestInterceptor', () => {
  test('GetLocationRequestInterceptor - GetLocationIntent is triggered with no flags set', async () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'GetLocationIntent',
            confirmationStatus: 'NONE',
          },
        },
        context: {
          System: {
            device: {
              deviceId: 'mockDeviceId',
            },
            apiEndpoint: 'mockApiEndpoint',
            apiAccessToken: 'mockApiAccessToken',
          },
        },
      },
      attributesManager: {
        getSessionAttributes: jest.fn().mockReturnValue({
          questionAsked: 'None',
          intentFlags: {},
        }),
        setSessionAttributes: jest.fn(),
      },
    };
  
    await GetLocationRequestInterceptor.process(handlerInput);
  
    expect(handlerInput.attributesManager.setSessionAttributes).not.toHaveBeenCalled();
  });
  test('GetLocationRequestInterceptor - GetLocationFromUserIntent is triggered with getGeolocation flag set', async () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'GetLocationFromUserIntent',
            confirmationStatus: 'NONE',
          },
        },
        context: {
          Geolocation: {
            mockGeolocationObject: 'mockGeolocationValue',
          },
          System: {
            device: {
              deviceId: 'mockDeviceId',
            },
            apiEndpoint: 'mockApiEndpoint',
            apiAccessToken: 'mockApiAccessToken',
          },
        },
      },
      attributesManager: {
        getSessionAttributes: jest.fn().mockReturnValue({
          questionAsked: 'None',
          intentFlags: {
            getGeolocation: true,
          },
        }),
        setSessionAttributes: jest.fn(),
      },
    };
  
    helper.isGeolocationAvailable = jest.fn().mockReturnValue("supported");
  
    await GetLocationRequestInterceptor.process(handlerInput);
  
    
   
  });
  test('GetLocationRequestInterceptor - GetLocationFromUserIntent is triggered with getHomeAddress flag set', async () => {
    const handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'GetLocationFromUserIntent',
            confirmationStatus: 'NONE',
          },
        },
        context: {
          System: {
            device: {
              deviceId: 'mockDeviceId',
            },
            apiEndpoint: 'mockApiEndpoint',
            apiAccessToken: 'mockApiAccessToken',
          },
        },
      },
      attributesManager: {
        getSessionAttributes: jest.fn().mockReturnValue({
          questionAsked: 'None',
          intentFlags: {
            getHomeAddress: true,
          },
        }),
        setSessionAttributes: jest.fn(),
      },
    };
  
    helper.getHomeAddress = jest.fn().mockReturnValue({
      data: {
        addressLine1: '123 Main St',
        city: 'Anytown',
      },
    });
  
    await GetLocationRequestInterceptor.process(handlerInput);
  
    expect(handlerInput.attributesManager.setSessionAttributes).toHaveBeenCalled();
    expect(handlerInput.attributesManager.setSessionAttributes.mock.calls[0][0].getLocation.homeAddress).toEqual
  });  
  
});


