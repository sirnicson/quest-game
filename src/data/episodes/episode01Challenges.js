import { listeningChallenge } from '../../core/listeningEngine.js';

export const challenges = [
  {id:1,lane:'Quiz',icon:'🧠',title:'Quick Win',prompt:'What does IMF stand for?',answer:'International Monetary Fund',move:1},
  {id:2,lane:'Speaking',icon:'🗣️',title:'Part 1',prompt:'Do you think it is better to stay alone than to stay with someone?',move:1},
  {id:3,lane:'Reading',icon:'📖',title:'Main Idea',prompt:'Read the short passage and choose the sentence that best captures its main idea.',options:['Cities are becoming more walkable for several connected reasons.','Cars are disappearing from every city.','Walking is only useful for tourists.'],answer:0,move:1},
  {...listeningChallenge('LS01'),id:4},
  {id:5,lane:'Writing',icon:'✍️',title:'Micro Task 1',prompt:'Describe the biggest change in a simple chart using a comparative.',move:1},
  {id:6,lane:'Quiz',icon:'🧠',title:'Brain Boost',prompt:'Which currency is used in Kazakhstan?',options:['Tenge','Som','Lari'],answer:0,move:1},
  {id:7,lane:'Reading',icon:'📖',title:'Evidence Trail',prompt:'A statement is made about an airport passenger system. Is it True, False or Not Given?',options:['True','False','Not Given'],answer:2,move:1},
  {id:8,lane:'Speaking',icon:'🗣️',title:'Long Turn',prompt:'Describe a country or city you would like to visit. You have 30 seconds to prepare.',move:1},
  {...listeningChallenge('LS06'),id:9},
  {id:10,lane:'Writing',icon:'✍️',title:'Task 2 Launch',prompt:'Write a 35–50 word introduction about higher education. Paraphrase the prompt and state your position.',move:1},
  {id:11,lane:'Quiz',icon:'🧠',title:'Big Brain',prompt:'Which company owns Instagram?',options:['Meta','Microsoft','ByteDance'],answer:0,move:1},
  {id:12,lane:'Reading',icon:'📖',title:'Scan & Find',prompt:'Complete the sentence from the electric-vehicle passage using no more than two words and/or a number.',move:1},
  {...listeningChallenge('LS02'),id:13},
  {id:14,lane:'Speaking',icon:'🗣️',title:'Part 3',prompt:'Why might studying or working abroad be important, and what problems could it create?',move:1},
  {id:15,lane:'Writing',icon:'✍️',title:'Develop the Idea',prompt:'Write 50–70 words on an advantage or disadvantage of studying abroad. Include a main idea, explanation, example and linking expression.',move:1}
];


export default challenges;
