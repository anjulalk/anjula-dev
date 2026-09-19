+++
title = "Projects"
description = "Projects by Anjula Karunarathne: fxtrack, a live USD to LKR bank rate tracker for Sri Lanka, final-year research forecasting Dogecoin with deep learning, and Google Summer of Code work on Joplin's keyboard shortcuts."
showDate = false
showReadingTime = false
showAuthor = false
showPagination = false
+++

## fxtrack
*Live web app · 2026*

Sri Lankan banks all publish a US dollar rate, and none of them agree. Buying from the wrong one on the wrong morning is worth a real detour, which is why the answer to "who is cheapest today" normally takes ten browser tabs. fxtrack reads those published pages four times a day and puts them in one place.

You pick what you are doing, buying or selling, by wire, in cash or with a card, and it ranks the banks for that case, names the best one right now, and shows the savings on the amount you entered. Each rate is also set against the Central Bank's indicative mid, so you can see whether today is a reasonable moment or one to wait out.

The pipeline is the part I care about. A scheduled job reads every bank's page, merges what it finds into append only CSVs, and rebuilds one snapshot per chart window. A field the bank stops publishing never erases the last value we hold, and a bank that goes quiet for a day drops off the board instead of quietly showing a stale number. The site itself is a Vue and TypeScript static build served from GitHub Pages on a subdomain, so there is no server in the request path.

Links: [fxtrack.anjula.dev](https://fxtrack.anjula.dev/) · [Source](https://github.com/anjulalk/fxtrack)

## Forecasting Dogecoin prices with Twitter sentiment and deep learning
*Final-year research · University of Colombo · 2022*

For my final year project I looked at whether the mood on Twitter carried any signal about the price of Dogecoin, a coin that spent 2021 being moved mostly by mood. I collected hourly prices from CoinGecko and three million tweets, filtered the tweets down to English, stripped retweets and bot like accounts, and scored sentiment with VADER.

The models had to predict six hourly prices ahead and were graded with walk-forward validation, which avoids the easy mistake of testing on data the model has already seen. Three architectures, trained on price history and sentiment together:

| Model | MAPE | RMSE | MAE |
|---|---|---|---|
| Vanilla LSTM | 8.74% | 0.080 | 0.050 |
| Encoder-decoder LSTM | 12.71% | 0.106 | 0.071 |
| CNN-LSTM encoder-decoder | 16.26% | 0.165 | 0.106 |

The plain LSTM did best, which was the useful result: the extra machinery of the seq2seq variants did not pay for itself at this horizon, and the sentiment signal was worth keeping but not strong enough to carry the prediction on its own.

Links: [Code and data pipeline](https://github.com/anjulalk/fyp) · [Paper, watermarked preview](/files/fyp-paper-preview.pdf)

## Custom keyboard shortcuts for Joplin
*Google Summer of Code · 2020*

Joplin's desktop app had hardcoded keyboard shortcuts and no way to change them. Over a summer I built a shortcut system for it, in two layers.

The first was a keymap service that keeps an in-memory map from commands to shortcuts, seeded from platform specific defaults and overridable from a keymap file in the profile directory, which takes priority. It exposes methods for reading and changing bindings and validates continuously, so the map cannot drift into a conflicted state.

The second was the editor, which lists every command with its shortcut and supports changing, disabling, restoring to the default, exporting and importing the keymap as JSON, and searching. Edits land in the profile keymap file straight away. Both parts shipped with the specification, interface sketches and weekly reports that went with the project.

Links: [GSoC project](https://summerofcode.withgoogle.com/archive/2020/projects/4772398752071680) · [KeymapService](https://github.com/laurent22/joplin/pull/3252) · [Editor](https://github.com/laurent22/joplin/pull/3525) · [Work product](https://gist.github.com/anjulalk/1ce1d16828f0727f385e2f6c4979cd7f)
