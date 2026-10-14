// Episode 01 Listening bank (LS01–LS10).
// `audioText` is the transcript that MeloTTS turns into the bundled clip (see scripts/generate-listening-audio.mjs).
// Each prompt is split around its ordered answer gaps; every gap owns its accepted answers and word limit.
const clip = (id, accent) => `assets/episodes/episode01/audio/${id}-${accent}.wav`;

const gap = (answerType, accepted) => ({ answerType, accepted });
const item = (id, level, topic, accent, promptParts, audioText, gaps) =>
  ({ id, level, topic, accent, promptParts, audioText, gaps, audio: clip(id, accent) });

export const listeningBank = [
  item('LS01','Medium','Travel announcement','en-GB',
    ['The train leaves from platform ', ' at ', '.'],
    'The train to Brussels will leave from platform three at ten twenty. Passengers should have their tickets ready before boarding.',
    [gap('one_word_or_number',['3','three']), gap('short_phrase',['ten twenty','10.20'])]),
  item('LS02','Medium','Weather','en-US',
    ['Rain is expected after ', ' o’clock. Travellers should carry ', ' clothing.'],
    'The forecast for the mountain area is sunny in the morning, but rain is expected after three o\'clock. Travellers should carry waterproof clothing because conditions may change quickly.',
    [gap('one_word_or_number',['3','three']), gap('one_word',['waterproof'])]),
  item('LS03','Medium','Museum information','en-AU',
    ['The museum is about ', ' minutes from the station on ', ', but visitors can also take the number ', ' bus from the main road.'],
    'The museum is about fifteen minutes from the station on foot. Visitors can also take the number six bus from the main road, although walking is usually quicker during busy periods.',
    [gap('number',['15','fifteen']), gap('one_word',['foot']), gap('one_word_or_number',['six','6'])]),
  item('LS04','Medium','Hotel information','en-IN',
    ['Breakfast is served from seven until ', ' in the morning in the ', ' beside reception.'],
    'Breakfast is served from seven until ten in the morning in the dining room beside reception. Guests who leave early can request a packed breakfast from the front desk.',
    [gap('one_word_or_number',['10','ten']), gap('short_phrase',['dining room'])]),
  item('LS05','Medium','Journey plan','en-GB',
    ['The group will spend the first night in ', ' and will continue ', ' on Tuesday to ', '.'],
    'The group will leave London on Monday morning and spend the first night in Paris. They will continue south-east on Tuesday and expect to reach Switzerland later that afternoon.',
    [gap('one_word',['Paris']), gap('short_phrase',['south-east','south east','southeast']), gap('one_word',['Switzerland'])]),
  item('LS06','Hard','Walking tour','en-US',
    ['Complete the sentence: The tour takes approximately ', '.'],
    'The walking tour begins at the central square at ten o\'clock and takes approximately ninety minutes, although the old brochure says two hours. Comfortable shoes are recommended because several streets are uneven.',
    [gap('short_phrase',['90 minutes','ninety minutes'])]),
  item('LS07','Hard','Mountain safety','en-AU',
    ['Complete the sentence: Strong ', ' can make the higher section unsafe.'],
    'Because the trail crosses exposed ground, visitors should check conditions before leaving. Heavy rain is not forecast, but strong winds can make the higher section unsafe even when the valley is calm.',
    [gap('one_word',['wind','winds'])]),
  item('LS08','Hard','Market visit','en-IN',
    ['Complete the sentence: Visitors should arrive before ', ' for a quieter experience.'],
    'The market opens early in the morning and is busiest just before lunchtime. Visitors who want a quieter experience should arrive before nine, when most of the larger groups have not yet arrived.',
    [gap('time',['9','nine','nine o\'clock','9 o\'clock'])]),
  item('LS09','Hard','Border travel','en-GB',
    ['Complete the sentence: Passengers should keep their ', ' accessible and be prepared to show identification.'],
    'At the border station, passengers should keep their travel documents accessible. Luggage will not need to be opened unless an officer asks, but passengers should be prepared to show identification.',
    [gap('short_phrase',['travel documents','documents'])]),
  item('LS10','Hard','Arrival','en-US',
    ['Complete the sentence: The coach is expected to arrive in Istanbul at ', '.'],
    'The coach is expected to arrive in Istanbul at half past six in the evening, although traffic near the city centre may cause a short delay. Passengers with onward connections should therefore allow extra time.',
    [gap('time',['6:30','6.30','half past six','six thirty','6:30 pm','6.30 pm'])])
];

export default listeningBank;
