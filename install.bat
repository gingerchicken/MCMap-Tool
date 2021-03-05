@echo off
echo Installing MCMap-Tool
CMD /C npm i --loglevel error

echo Downloading Map Colour Sets...
CMD /C py -m pip install -r scripts/requirements.txt
py scripts/mc_download_colours.py shared/colour_sets.json

echo Thank you for choosing MCMap-Tool!
echo    -Make sure to give me a star on GitHub if you found it useful ^<3