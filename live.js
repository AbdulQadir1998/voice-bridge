
require('dotenv').config();
const { Deepgram } = require('@deepgram/sdk');
const fetch = require("cross-fetch");
const express = require('express');
const OpenAI = require('openai')
const http = require("http");
const app = express();
const translate = require('deepl');
  
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;
const openAIApiKey = process.env.OPENAI_API_KEY;

if (!deepgramApiKey || !deeplApiKey || !openAIApiKey) {
    console.error('Environment variables missing');
}

const openai = new OpenAI({
	apiKey: openAIApiKey,
});

// Initialize Deepgram
const deepgram = new Deepgram(deepgramApiKey);
const server = http.createServer(app);

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000/");
  });

  function isValidURL(str) {
    try {
      new URL(str);
      return true;
    } catch (e) {
      return false;
    }
  }


    /**
     * some tracking variables are used incase local host server tab refreshes the page 
     * by chrome auto. or by client to close previous deepgram or stream 
     * server. 
     * Handle this temporarily for now as websockets are not used in this file.
     * 
     */

  let activeStream = null;  // To keep track of any active streams
  let activeDeepgram = null; // To track active Deepgram instance

app.get('/live-audio', (req, res) => {

    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    });

    const translateLanguage = req.query.lang || 'EN-US';
    const streamURL = req.query.streamURL || "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service"
    const streamLanguage = req.query.streamLang || 'EN-US'
    const isValid = isValidURL(streamURL)

    if(!isValid){
        return console.error("NOT VALID URL")
    }

    if (activeStream) {
      console.log("Closing existing stream");
      activeStream.destroy(); 
    }

    if (activeDeepgram) {
        console.log("Closing existing Deepgram connection");
        activeDeepgram.finish();  
        activeDeepgram.removeAllListeners();  
    }

    let deepgramLive = deepgram.transcription.live({
      model: 'nova-2',
      interim_results: false,
      punctuate: true,
      endpointing: true,
      vad_turnoff: 10,
      language: streamLanguage // needed for better results
    });

    deepgramLive.addListener('open', () => {
      console.error("Deepgram started:");
 
      activeDeepgram = deepgramLive;  // Track the new instance

    // Will integrate it if needed
    // deepgramLive.addListener('error', (err) => {
    //   console.error("Deepgram Error:", err);
    //   // res.end();
    // });
   
    fetch(streamURL)
      .then((response) => {
        if (!response.ok) {
          res.end()
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.body;
      })
      .then((stream) => {
        activeStream = stream;  // Track the active stream

        stream.on('error', (err) => {
          console.error('Stream Error:', err);
          res.end();
        });
        
        stream.on("readable", () => {
          try {
            const chunk = stream.read();
            if (chunk) {
              
              /**
               * Deepgram connection OPEN = 1
               * Deepgram connection CLOSING = 2
               * Deepgram connection CLOSED = 3
               */

              if (deepgramLive.getReadyState() === 1 ) {
                deepgramLive.send(chunk);
              } else if (deepgramLive.getReadyState() >= 2 ) {
                console.log("socket: data couldn't be sent to deepgram");
                console.log("socket: retrying connection to deepgram");
                deepgramLive.finish();
                deepgramLive.removeAllListeners();

                /* Attempt to reopen the Deepgram connection */

                deepgramLive = deepgram.transcription.live({
                  model: 'nova-2',
                  interim_results: false,
                  punctuate: true,
                  endpointing: true,
                  vad_turnoff: 10,
                  language: streamLanguage
                });

              } else {
                console.error("Something went wrong with deepgram");
              }

            }
          } catch (err) {
            console.error('Error reading or sending chunk:', err);
          }
        });
    
        // Handle when the stream ends
        res.on('end', () => {
          console.log('Stream ended');
          deepgramLive.finish(); 
          deepgramLive.removeAllListeners();
          res.end();

        });
      })
      .catch((err) => {
        console.error('Fetch Error:', err);
      });
    
    deepgramLive.addListener('transcriptReceived', async(message) => {

    const data = JSON.parse(message)
    const alternatives = data?.channel?.alternatives
    let transcript = ''
    
    if(alternatives?.length){
      transcript = alternatives[0].transcript
    }

    if(transcript) {
      try {
        const translationResponse =  await translate({
          free_api: true,
          text: transcript,
          target_lang: translateLanguage,
          auth_key: deeplApiKey,
        })
        const translation =   translationResponse?.data?.translations[0]?.text

        console.log("translation",translation)

        const audio = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: translation,
          });

        const stream = audio.body

        stream.on('data', (chunk) => {
          if (res.writable) {
            res.write(chunk);  // Write each audio chunk to the response
          }
        });

        // will be used in future
        //   stream.on('error', (err) => {
        //     console.error('Stream Error:', err);
        //     res.end();
        // }); 
      } catch (error) {
        console.error('Error in processing message:', error); 
      }
    }
  })
    });
})