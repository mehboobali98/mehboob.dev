"""Rebuild src/assets/fonts from the fontsource packages: uvx --with brotli --from fonttools python scripts/share-card-fonts.py"""
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FILES = 'node_modules/@fontsource-variable/fraunces/files', 'node_modules/@fontsource/ibm-plex-mono/files'
OUT = 'src/assets/fonts'

fraunces = TTFont(f'{FILES[0]}/fraunces-latin-wonk-normal.woff2', recalcTimestamp=False)
fraunces.flavor = None
instancer.instantiateVariableFont(fraunces, {'wght': 600, 'WONK': 1}).save(f'{OUT}/Fraunces-SemiBold-Wonk.ttf')

mono = TTFont(f'{FILES[1]}/ibm-plex-mono-latin-400-normal.woff2', recalcTimestamp=False)
mono.flavor = None
mono.save(f'{OUT}/IBMPlexMono-Regular.ttf')
