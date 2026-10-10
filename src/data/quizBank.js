// Central General Knowledge Quiz bank. Any episode can draw from it; it is separate from the episode question banks.
// Each row: id, topic, question, [correct answer, ...wrong options], extra accepted spoken/typed forms.
const row = (id, topic, prompt, options, extra = []) => ({
  id,
  level: 'General',
  topic,
  prompt,
  answer: options[0],
  options,
  correct: 0,
  accepted: [options[0], ...extra]
});

export const quizBank = [
  row('QZ01', 'Nature', 'Which bird is a universal symbol of peace?', ['Dove', 'Eagle', 'Owl', 'Swan'], ['A dove', 'The dove']),
  row('QZ02', 'History', 'Who invented the airplane?', ['Wright brothers', 'Montgolfier brothers', 'Thomas Edison', 'Alexander Graham Bell'], ['The Wright brothers', 'Wright', 'Orville and Wilbur Wright']),
  row('QZ03', 'Space', 'Which planet is known as the Morning Star?', ['Venus', 'Mars', 'Jupiter', 'Mercury']),
  row('QZ04', 'Human body', 'Which part of the body has the most bones?', ['Hand', 'Skull', 'Ribcage', 'Ear'], ['The hand', 'Hands']),
  row('QZ05', 'Animals', 'Which is the only mammal that can fly?', ['Bat', 'Owl', 'Flying fish', 'Dragonfly'], ['A bat', 'The bat', 'Bats']),
  row('QZ06', 'Space', 'What is the hottest planet in the solar system?', ['Venus', 'Mercury', 'Mars', 'Jupiter']),
  row('QZ07', 'Maths', 'What is the square root of 49?', ['7', '6', '8', '9'], ['Seven']),
  row('QZ08', 'Animals', 'What is the largest bird?', ['Ostrich', 'Eagle', 'Penguin', 'Albatross'], ['An ostrich', 'The ostrich']),
  row('QZ09', 'Animals', 'How many legs does a crab have?', ['10', '6', '8', '12'], ['Ten']),
  row('QZ10', 'Geography', 'Where does the sun rise?', ['East', 'West', 'North', 'South'], ['The east']),
  row('QZ11', 'Food', 'Which fruit is made up of 90% water?', ['Watermelon', 'Banana', 'Apple', 'Mango'], ['Water melon', 'A watermelon']),
  row('QZ12', 'History', 'In what year did World War I begin?', ['1914', '1812', '1918', '1939'], ['Nineteen fourteen']),
  row('QZ13', 'Geography', 'How many countries are there in the world?', ['195', '150', '180', '210'], ['One hundred ninety five', 'One hundred and ninety five']),
  row('QZ14', 'Technology', 'Which social media platform is used the most?', ['Facebook', 'Instagram', 'Twitter', 'Snapchat']),
  row('QZ15', 'Geography', 'Which country is also a continent?', ['Australia', 'Greenland', 'Iceland', 'Brazil']),
  row('QZ16', 'Human body', 'What is the largest organ in the human body?', ['The skin', 'The liver', 'The heart', 'The brain'], ['Skin']),
  row('QZ17', 'Sport', 'In which sport do you score a home run?', ['Baseball', 'Cricket', 'Football', 'Basketball']),
  row('QZ18', 'Food', 'Which drink is made from fermented grapes?', ['Wine', 'Beer', 'Whisky', 'Cider']),
  row('QZ19', 'Animals', 'Which animal is the most dangerous to humans?', ['Mosquito', 'Shark', 'Snake', 'Lion'], ['A mosquito', 'The mosquito']),
  row('QZ20', 'Geography', 'Which country has the most forest?', ['Russia', 'Brazil', 'Canada', 'China']),
  row('QZ21', 'History', 'What ancient city was destroyed and buried by a volcanic eruption in AD 79?', ['Pompeii', 'Troy', 'Carthage', 'Athens']),
  row('QZ22', 'History', 'In what year did the USA drop an atomic bomb on Japan?', ['1945', '1939', '1941', '1950'], ['Nineteen forty five']),
  row('QZ23', 'History', 'Who was the Mongol leader who established the largest land empire in history?', ['Genghis Khan', 'Attila the Hun', 'Alexander the Great', 'Julius Caesar'], ['Chinggis Khan']),
  row('QZ24', 'History', 'In what year did the USA declare independence from Britain?', ['1776', '1789', '1812', '1865'], ['Seventeen seventy six']),
  row('QZ25', 'History', 'What was the major trade route connecting the East and the West in ancient times?', ['The Silk Road', 'The Amber Road', 'The Royal Road', 'The Appian Way'], ['Silk Road']),
  row('QZ26', 'Geography', 'Which continent is the most populous?', ['Asia', 'Africa', 'Europe', 'South America']),
  row('QZ27', 'Literature', 'Who wrote Romeo and Juliet?', ['Shakespeare', 'Charles Dickens', 'Geoffrey Chaucer', 'Christopher Marlowe'], ['William Shakespeare']),
  row('QZ28', 'Geography', 'What is the largest ocean on Earth?', ['The Pacific', 'The Atlantic', 'The Indian', 'The Arctic'], ['Pacific', 'Pacific Ocean', 'The Pacific Ocean']),
  row('QZ29', 'Animals', 'How many legs does a spider have?', ['8', '6', '10', '12'], ['Eight']),
  row('QZ30', 'Brands', 'What country is IKEA from?', ['Sweden', 'Norway', 'Denmark', 'Finland'])
];
