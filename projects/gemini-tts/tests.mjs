// The test texts for the Gemini TTS review. Each one checks a different kind of speech.
// `instructions` is the style prompt; Gemini 3.8 reads `input` word for word, so directions go there.

export const tests = [
  {
    id: "01-narration",
    title: "Plain narration",
    voice: "Charon",
    instructions: "Calm, warm audiobook narrator. Unhurried pace.",
    input:
      "The lighthouse keeper had not spoken to anyone in eleven days. Every morning he climbed the hundred and twelve steps, wiped the salt from the glass, and wrote the same three words in his logbook: wind from west. On the twelfth morning, there was a boat on the horizon, and it was heading straight for him.",
  },
  {
    id: "02-casual",
    title: "Casual, like a real person talking",
    voice: "Puck",
    instructions: "Relaxed and casual, like telling a friend a story over coffee. Natural hesitations.",
    input:
      "Okay so, um, I finally tried that new ramen place downtown? And honestly... it was fine. Like, the broth was really good, I'll give them that. But I waited forty minutes for a table, and then the guy next to me knocked my drink over, so. Yeah. I don't know. Maybe I'll go back. Probably not though.",
  },
  {
    id: "03-news",
    title: "News anchor",
    voice: "Kore",
    instructions: "Professional evening news anchor. Clear, confident, measured.",
    input:
      "Good evening. Officials confirmed today that the city's new tram line will open three months ahead of schedule. The twelve kilometre route connects the airport to the central station, and is expected to carry around forty thousand passengers a day. Construction crews worked overnight shifts for most of the summer to finish the final section.",
  },
  {
    id: "04-sad",
    title: "Emotional: grief",
    voice: "Sulafat",
    instructions: "Quiet and grieving, voice close to breaking, slow with long pauses.",
    input:
      "I kept his jacket on the hook by the door. I know that sounds silly. It's been two years. But every time I walk past it, for just a second, I think he's home. And then I remember. And I leave it there anyway.",
  },
  {
    id: "05-hype",
    title: "Emotional: excitement (sports commentary)",
    voice: "Fenrir",
    instructions: "Live football commentator losing his mind with excitement, fast and loud, rising to a shout.",
    input:
      "He picks it up at halfway, past one, past two, he's still going! Thirty seconds left on the clock! He shoots! It's in! It's in! I cannot believe what we have just seen here tonight! Absolutely unbelievable!",
  },
  {
    id: "06-angry",
    title: "Emotional: anger",
    voice: "Orus",
    instructions: "Frustrated customer on the phone, getting angrier with each sentence but trying to stay polite.",
    input:
      "No, I understand that. I do. But this is the fourth time I've called this week. Fourth. Every single time someone tells me it'll be fixed in twenty four hours, and every single time, nothing happens. So I'm not asking you to open another ticket. I'm asking to speak to someone who can actually fix it.",
  },
  {
    id: "07-whisper",
    title: "Whisper / bedtime story",
    voice: "Leda",
    instructions: "Soft whisper, like reading a bedtime story to a child who is almost asleep.",
    input:
      "And the little fox curled up under the old oak tree, tucked her nose under her tail, and listened to the rain. Pitter, patter, pitter, patter. The forest was quiet now. Everyone was safe. And slowly, slowly, her eyes closed.",
  },
  {
    id: "08-laugh",
    title: "Laughing while talking",
    voice: "Zephyr",
    instructions: "Can barely get the words out from laughing. Genuine giggles between phrases.",
    input:
      "So he walks into the meeting, right, fully confident, starts presenting, and he's still got the cat filter on. The whole time. Twenty minutes. A little cat. Talking about quarterly revenue. And nobody said anything!",
  },
  {
    id: "09-technical",
    title: "Hard text: numbers, code, acronyms",
    voice: "Achird",
    instructions: "Developer explaining something to a colleague. Natural, not robotic.",
    input:
      "Run npm install, then open localhost:3000. If you get a 404, check that NODE_ENV is set to development. The API costs $0.50 per million tokens, and the release on 29/10/2026 bumped it to v3.8.1. Oh, and the SQL query takes about 1.2ms, which is fine.",
  },
  {
    id: "10-tongue-twister",
    title: "Speed: tongue twister",
    voice: "Aoede",
    instructions: "Say it quickly and cleanly, slightly showing off.",
    input:
      "Six sticky skeletons sat silently sorting sixty-six slippery sardines, while a proper copper coffee pot perked perfectly on the stove.",
  },
  {
    id: "11-dialogue",
    title: "Two speakers: podcast",
    voice: "Kore",
    instructions: "Relaxed podcast conversation between two friends.",
    input: [
      { voice: "Kore", text: "So, have you actually switched to the new phone yet?" },
      { voice: "Puck", text: "I have. And I hate to say it, but the battery is incredible. I charged it on Sunday." },
      { voice: "Kore", text: "Sunday? It's Thursday!" },
      { voice: "Puck", instructions: "smug, laughing", text: "I know. I'm not even sorry." },
      { voice: "Kore", instructions: "mock outrage", text: "Okay, that's it, I'm buying one tomorrow." },
    ],
  },
  {
    // The same message translated, one clip per language, so viewers can compare their own.
    id: "12-languages",
    title: "Other languages (same message, one clip each)",
    voice: "Despina",
    variants: [
      { suffix: "spanish", instructions: "Friendly, natural native Spanish speaker.", input: "¡Hola a todos! Esta es una prueba rápida para escuchar qué tan natural suena esta voz en español. Si estás escuchando esto, dime en los comentarios qué te parece." },
      { suffix: "french", instructions: "Friendly, natural native French speaker.", input: "Bonjour à tous ! Ceci est un petit test pour entendre à quel point cette voix sonne naturelle en français. Si vous écoutez ceci, dites-moi dans les commentaires ce que vous en pensez." },
      { suffix: "german", instructions: "Friendly, natural native German speaker.", input: "Hallo zusammen! Das ist ein kurzer Test, um zu hören, wie natürlich diese Stimme auf Deutsch klingt. Wenn du das hörst, schreib mir in die Kommentare, was du davon hältst." },
      { suffix: "portuguese", instructions: "Friendly, natural native Brazilian Portuguese speaker.", input: "Olá, pessoal! Este é um teste rápido para ouvir o quão natural esta voz soa em português. Se você está ouvindo isso, me conta nos comentários o que achou." },
      { suffix: "japanese", instructions: "Friendly, natural native Japanese speaker.", input: "皆さん、こんにちは！これは、この声が日本語でどれくらい自然に聞こえるかを確かめるための簡単なテストです。聞いてみて、どう思ったかコメントで教えてください。" },
      { suffix: "korean", instructions: "Friendly, natural native Korean speaker.", input: "안녕하세요 여러분! 이 목소리가 한국어로 얼마나 자연스럽게 들리는지 확인하는 짧은 테스트입니다. 들어 보시고 어떠셨는지 댓글로 알려 주세요." },
      { suffix: "mandarin", instructions: "Friendly, natural native Mandarin Chinese speaker.", input: "大家好！这是一个简短的测试，听听这个声音说中文有多自然。如果你正在听，请在评论里告诉我你的感受。" },
      { suffix: "hindi", instructions: "Friendly, natural native Hindi speaker.", input: "नमस्ते दोस्तों! यह एक छोटा सा टेस्ट है, यह सुनने के लिए कि यह आवाज़ हिंदी में कितनी नैचुरल लगती है। अगर आप इसे सुन रहे हैं, तो कमेंट में बताइए कि आपको कैसी लगी।" },
    ],
  },
  {
    id: "13-same-text-styles",
    title: "Same line, three moods",
    voice: "Algieba",
    variants: [
      { suffix: "a-happy", instructions: "Delighted, surprised in a good way." },
      { suffix: "b-suspicious", instructions: "Suspicious, quietly accusing." },
      { suffix: "c-terrified", instructions: "Terrified, whispering, trying not to be heard." },
    ],
    input: "I didn't expect to see you here tonight.",
  },
  {
    id: "14-flash-vs-lite",
    title: "Flash vs Flash Lite, same text",
    voice: "Charon",
    instructions: "Warm, confident product presenter.",
    models: ["google/gemini-3.8-flash-tts", "google/gemini-3.8-flash-lite-tts"],
    input:
      "This is the part I'm most excited about. You open the app, you say what you need, and it just handles the rest. No settings, no menus, no manual. It simply works the way you'd expect it to.",
  },
  {
    id: "15-inline-square",
    title: "Inline emotion tags [square brackets], no style prompt",
    voice: "Zephyr",
    input:
      "[excited] Guess what, I got the job! [laughs] I honestly can't believe it. [sighs] Although... [whispering] I haven't told my current boss yet. [nervous] And I have to do it tomorrow morning.",
  },
  {
    id: "16-inline-angle",
    title: "Inline emotion tags <angle brackets>, no style prompt",
    voice: "Zephyr",
    input:
      "<excited> Guess what, I got the job! <laughs> I honestly can't believe it. <sighs> Although... <whispering> I haven't told my current boss yet. <nervous> And I have to do it tomorrow morning.",
  },
  {
    // The same English text, one clip per accent; the accent only comes from the style prompt.
    id: "17-accents",
    title: "English in different accents (same text, one clip each)",
    voice: "Puck",
    input:
      "Right, so I was on the train this morning, and the man next to me had a dog in his bag. Just its little head poking out. Nobody said a word about it, and honestly, it was the best part of my day.",
    variants: [
      { suffix: "british", instructions: "Speak with a London British accent. Casual, chatty." },
      { suffix: "scottish", instructions: "Speak with a strong Glasgow Scottish accent. Casual, chatty." },
      { suffix: "irish", instructions: "Speak with a Dublin Irish accent. Casual, chatty." },
      { suffix: "australian", instructions: "Speak with a broad Australian accent. Casual, chatty." },
      { suffix: "indian", instructions: "Speak with an Indian English accent. Casual, chatty." },
      { suffix: "southern-us", instructions: "Speak with a Texan Southern American accent. Casual, chatty." },
      { suffix: "nigerian", instructions: "Speak with a Nigerian English accent. Casual, chatty." },
    ],
  },
  {
    // Angle-bracket tags that pull against the words, to show the model follows the tag.
    id: "18-angle-mismatch",
    title: "Inline <angle> tags that clash with the text",
    voice: "Zephyr",
    input:
      "<laughing> My cat knocked my laptop off the table this morning. <crying> And then he just looked at me, like it was my fault. <angry> It was a really nice laptop! <whispering> I still love him though.",
  },
];
