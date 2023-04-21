

const alexaTest = require('../index.js');


describe('Sacramento 311 ', () => {
    test('Launches the app', async () => {
        const result = await alexa.intents.launch();
        expect(result.response.outputSpeech.ssml).toContain('');
    
    });

});
