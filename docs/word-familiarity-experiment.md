# Word Familiarity Experiment

These are provisional judgments based only on my intuition. I did not consult Google Ngram or any other frequency source.

All words below appear in the current combined word list (`ALLOWED_WORDS`).

## Very common

- about
- after
- house
- other
- their
- again
- every
- first
- great
- never
- place
- right
- small
- still
- think
- water
- world

## Familiar

- guava
- aorta
- aroma
- quark
- sushi
- fjord
- adorn
- brawn
- guise
- plaid
- stilt

## Uncommon

- banal
- cairn
- mirth
- chasm

## Obscure

- cavil
- nacre
- bovid
- eclat
- osier
- ulnae
- zloty

## Notes for review

- “Familiar” means I expect many players to recognize the word, even if they do not use it often.
- “Uncommon” means recognizable to some players but not an everyday word.
- “Obscure” means likely to require unusual vocabulary, specialist knowledge, or a lucky guess.
- These categories are intentionally subjective and should be revised before comparing them with frequency data.

## Google Ngram comparison

Parameters: English corpus, 2000–2010 inclusive, smoothing 0. Each tuple is `(word, mean_frequency)` across the eleven yearly values returned by Google Ngram. The values are normalized frequencies, not absolute raw counts.

### Very common

```text
(about, 1.168215e-3)
(after, 6.130667e-4)
(house, 1.842685e-4)
(other, 1.329480e-3)
(their, 1.838067e-3)
```

### Familiar

```text
(guava, 2.743982e-7)
(aorta, 2.368744e-6)
(aroma, 2.393649e-6)
(quark, 1.611460e-6)
(sushi, 7.958948e-7)
(fjord, 3.236404e-7)
(again, 2.729325e-4)
(every, 2.701821e-4)
(first, 7.522615e-4)
(great, 2.643059e-4)
(never, 3.034320e-4)
(place, 3.394210e-4)
(right, 4.244767e-4)
(small, 3.059460e-4)
(still, 3.541476e-4)
(think, 3.051920e-4)
(water, 3.173651e-4)
(world, 3.746997e-4)
(adorn, 9.372014e-7)
(brawn, 2.008864e-7)
(guise, 2.475991e-6)
(plaid, 8.374455e-7)
(stilt, 1.587251e-7)
```

### Uncommon

```text
(banal, 9.747588e-7)
(cairn, 3.902477e-7)
(mirth, 9.789507e-7)
(chasm, 1.214017e-6)
```

### Obscure

```text
(cavil, 1.047898e-7)
(nacre, 6.462818e-8)
(bovid, 3.754091e-8)
(eclat, 5.070454e-8)
(osier, 5.808773e-8)
(ulnae, 1.701389e-8)
(zloty, 1.340389e-7)
```
