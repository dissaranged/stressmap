#!/bin/bash

git checkout gh-pages

#wget https://stressfaktor.squat.net/termine.php -O data/termine.html
mkdir -p data
rm data/termine.php*

cd data
for i in Monday Tuesday Wednesday Thursday Friday Saturday Sunday; do
    tag=`date -d $i +%d%m%Y`
    wget https://stressfaktor.squat.net/termine.php?tag=$tag
done;
wget https://stressfaktor.squat.net/adressen.php
wget https://stressfaktor.squat.net/kuefa.php?day=all
cd -

node data-aquisition.js &&
    mv tst-events.json events.json &&
#    mv tst-stressfaktoren.json stressfaktoren.json &&
    #    mv tst-kuefas.jsson kuefas.json &&
    true
git add {events,kuefas,stressfaktoren}.json
git commit -m "new data"
git push origin gh-pages
