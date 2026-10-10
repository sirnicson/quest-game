// Episode 01 Listening bank (LS01–LS10).
// `audioText` is the transcript that MeloTTS turns into the bundled clip (see scripts/generate-listening-audio.mjs).
// `accepted` lists every correct typed answer; answerType decides the word limit (see core/listeningEngine.js).
const clip = (id, accent) => `assets/episodes/episode01/audio/${id}-${accent}.wav`;

const item = (id, level, topic, accent, prompt, audioText, answerType, accepted) =>
  ({ id, level, topic, accent, prompt, audioText, answerType, accepted, audio: clip(id, accent) });

export const listeningBank = [
  item('LS01','Medium','Travel announcement','en-GB','Complete the sentence: The train leaves from platform ____ at ten twenty.',
    'The train to Brussels will leave from platform three at ten twenty. Passengers should have their tickets ready before boarding.',
    'one_word_or_number',['3','three']),
  item('LS02','Medium','Weather','en-US','Complete the sentence: Rain is expected after ____ o\'clock.',
    'The forecast for the mountain area is sunny in the morning, but rain is expected after three o\'clock. Travellers should carry waterproof clothing because conditions may change quickly.',
    'one_word_or_number',['3','three']),
  item('LS03','Medium','Museum information','en-AU','Complete the sentence: The museum is about ____ minutes from the station on foot.',
    'The museum is about fifteen minutes from the station on foot. Visitors can also take the number six bus from the main road, although walking is usually quicker during busy periods.',
    'number',['15','fifteen']),
  item('LS04','Medium','Hotel information','en-IN','Complete the sentence: Breakfast is served from seven until ____ in the morning.',
    'Breakfast is served from seven until ten in the morning in the dining room beside reception. Guests who leave early can request a packed breakfast from the front desk.',
    'one_word_or_number',['10','ten']),
  item('LS05','Medium','Journey plan','en-GB','Complete the sentence: The group will spend the first night in ____.',
    'The group will leave London on Monday morning and spend the first night in Paris. They will continue south-east on Tuesday and expect to reach Switzerland later that afternoon.',
    'one_word',['Paris']),
  item('LS06','Hard','Walking tour','en-US','Complete the sentence: The tour takes approximately ____.',
    'The walking tour begins at the central square at ten o\'clock and takes approximately ninety minutes, although the old brochure says two hours. Comfortable shoes are recommended because several streets are uneven.',
    'short_phrase',['90 minutes','ninety minutes']),
  item('LS07','Hard','Mountain safety','en-AU','Complete the sentence: Strong ____ can make the higher section unsafe.',
    'Because the trail crosses exposed ground, visitors should check conditions before leaving. Heavy rain is not forecast, but strong winds can make the higher section unsafe even when the valley is calm.',
    'one_word',['wind','winds']),
  item('LS08','Hard','Market visit','en-IN','Complete the sentence: Visitors should arrive before ____ for a quieter experience.',
    'The market opens early in the morning and is busiest just before lunchtime. Visitors who want a quieter experience should arrive before nine, when most of the larger groups have not yet arrived.',
    'time',['9','nine','nine o\'clock','9 o\'clock']),
  item('LS09','Hard','Border travel','en-GB','Complete the sentence: Passengers should keep their ____ accessible and be prepared to show identification.',
    'At the border station, passengers should keep their travel documents accessible. Luggage will not need to be opened unless an officer asks, but passengers should be prepared to show identification.',
    'short_phrase',['travel documents','documents']),
  item('LS10','Hard','Arrival','en-US','Complete the sentence: The coach is expected to arrive in Istanbul at ____.',
    'The coach is expected to arrive in Istanbul at half past six in the evening, although traffic near the city centre may cause a short delay. Passengers with onward connections should therefore allow extra time.',
    'time',['6:30','6.30','half past six','six thirty','6:30 pm','6.30 pm'])
];

export default listeningBank;
