-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Example where

-- TODO: export from Skald.
import Control.Monad.Eff (Eff)

import Skald

-- Volume - Front matter -------------------------------------------------------

main :: Eff (Effects ()) Unit
main = tale "Example Tale"
    # by "Ian D. Bollinger"
    # thatBeginsIn cavernEntrance
    # withPlaces [
        cavernInterior,
        cavernSpring,
        well,
        northernInnerWardCourtyard,
        keepApproach,
        southernInnerWardCourtyard,
        library,
        gallery,
        greatHall,
        kitchen,
        larder,
        gatehouse,
        outerWardCourtyard
    ]
    # run

-- Volume - Body matter --------------------------------------------------------

-- Chapter - The caves beneath Akkonai -----------------------------------------

-- Section - Cavern entrance ---------------------------------------------------

cavernEntrance :: Place
cavernEntrance = place "cavern entrance"
    # withDescription cavernEntranceDescription
    # withExit north "cavern interior"
    # containing [boulders]

cavernEntranceDescription :: String
cavernEntranceDescription = "The mouth of the cave was little more than a slit\
    \ between two boulders; it lay to the north."

boulders :: Object
boulders = scenery "boulders"
    "Though close, you could squeeze easily between the rocks."

-- Section - The cavern interior -----------------------------------------------

cavernInterior :: Place
cavernInterior = place "cavern interior"
    # withExits [south `to` "cavern entrance", north `to` "cavern spring"]
    # withDescription "A sliver of light filtered through the southern\
    \ entrance, illuminating a thin streak across the cavern floor. The blue\
    \ glow of your alchemic lantern revealed a tunnel leading north."

-- Section - The cavern spring -------------------------------------------------

cavernSpring :: Place
cavernSpring = place "cavern spring"
    # withExits [south `to` "cavern interior", west `to` "well"]
    # withDescription cavernSpringDescription
    # containing [stalactites, poolOfWater, waterline, aperture]

cavernSpringDescription :: String
cavernSpringDescription = "Stalactites glistened over a pool of water. Not far\
    \ below them, a waterline marked the cave walls above your head. There\
    \ was an aperture in the wall to the west. A tunnel lead to the south."

stalactites :: Object
stalactites = scenery "stalactites"
    "Bone-white protuberances hung from the cave’s ceiling."

poolOfWater :: Object
poolOfWater = scenery "pool of water"
    "You suspected a spring fed this pool."
    # insteadOf taking (say "you lacked a container to carry water.")

waterline :: Object
waterline = scenery "waterline"
    "The water had been much higher in the past."

aperture :: Object
aperture = scenery "aperture"
    "You could not make out what was on the other side."

-- Section - The well ----------------------------------------------------------

well :: Place
well = place "well"
    # withExits [
        east `to` "cavern spring",
        up `to` "northern inner ward courtyard"
        ]
    # withDescription "You found yourself at the bottom of a dry well. A spiral\
        \ staircase wound around the well’s interior. A hole in the east side\
        \ of the well lead to the spring that once supplied it."
    # containing [spiralStaircase, hole]

spiralStaircase :: Object
spiralStaircase = scenery "spiral staircase"
    "Running along the stairs was a low wall, above which sat a series of\
    \ arches that held up the span of stairs overhead."

hole :: Object
hole = scenery "hole"
    "You could not make out what was on the other side."

-- Chapter - Inside the walls of Akkonai ---------------------------------------

-- Section - The northern inner ward courtyard ---------------------------------

northernInnerWardCourtyard :: Place
northernInnerWardCourtyard = place "northern inner ward courtyard"
--    # exterior
    # withExits [
        down `to` "well",
        north `to` "keep approach",
        south `to` "southern inner ward courtyard"
        ]
    # whenDescribing (\x ->
        "Stairs spiraled around a seemingly bottomless hole in "
        <> (if unvisited x then "what must be " else "")
        <> "the inner ward of Akkonai."
        <> (if unvisited x then " you exhaled—both relieved and fatigued."
            else "")
        <> " A tirùnga grew from the center of the ward, its roots hidden\
            \ beneath a blanket of fog. Stairs ran north to the keep."
        )
    # containing [fog, tirungaTree, roots, leaves]

fog :: Object
fog = scenery "fog"
    "A thin layer of dense fog covered the majority of the courtyard of the\
    \ inner ward."

tirungaTree :: Object
tirungaTree = scenery "tirùnga tree"
    "The builders of the castle must have purposely built the inner ward around\
    \ the enormous tree. Perhaps it would remain when the walls of Akkonai had\
    \ been ground to dust by rain and wind."

roots :: Object
roots = scenery "roots"
    "The roots of the tirùnga could not be made out in the dense fog."

leaves :: Object
leaves = scenery "leaves"
    "The tirùnga was prized for its blood-red leaves; it was often used as an\
    \ ornamental plant."
    # insteadOf taking (say "The leaves were too far above to take.")

-- Section - The keep approach -------------------------------------------------

keepApproach :: Place
keepApproach = place "keep approach"
    # withExit south "northern inner ward courtyard"
    # withDescription "An enormous stairway lead up the craggy motte to the\
        \ keep. It, clad in black marble, was crowned with corbels depicting\
        \ various impish creatures. The rest of the inner ward was to the\
        \ south."
    # containing [corbels, fog, tirungaTree, roots, leaves]

corbels :: Object
corbels = scenery "corbels"
    "Between the arch-supporting corbels were machicolations; you imagined\
    \ eyes watching from them."

keepDoor :: Object
keepDoor = scenery "keep door"
    "The doors to the keep were two imposing slabs of dark metal. They lacked\
    \any sort of handle or latch."

-- Section - The southern inner ward courtyard ---------------------------------

southernInnerWardCourtyard :: Place
southernInnerWardCourtyard = place "southern inner ward courtyard"
--    # exterior
    # withExits [
        north `to` "northern inner ward courtyard",
        east `to` "gallery",
        west `to` "great hall",
        south `to` "gatehouse"
        ]
    # withDescription "Fog covered the courtyard of the inner ward. A massive\
        \ tirùnga punctured the center of the ward, spreading its canopy of\
        \ crimson, spear-shaped leaves far overhead. The path to the keep lead\
        \ north. There were structures to the east and west. To the south was\
        \ the inner ward gate."
    # containing [fog, tirungaTree, roots, leaves]

-- Section - The library -------------------------------------------------------

library :: Place
library = place "library"
    # withExit north "gallery"
    # whenDescribing (\x ->
      (if unvisited x then "You knew better than to hope the Akkonai’s\
          \ library would be intact, but the scene disheartened you still. "
          else "")
      <> "The myriad shelves "
      <> (if visited x then "of the once grand library " else "")
      <> "had been thoroughly looted decades ago. An alcove to the east housed\
          \  broken bench and the shattered remains of a stained glass window.\
          \ An archway to the north lead to the gallery; the door it once\
          \ supported lay beneath it."
      )
    # containing [libraryShelves, brokenBench]

libraryShelves :: Object
libraryShelves = scenery "library shelves"
    "The shelves were bare and blanketed with dust. Not even a scrap of\
    \ parchment remained. This was the work of the Academy."

brokenBench :: Object
brokenBench = scenery "broken bench"
    "It listed to one side as two of its legs were missing."

libraryDoor :: Object
libraryDoor = scenery "library door"
    "The door had long ago fallen to the floor."

stainedGlassWindow :: Object
stainedGlassWindow = scenery "stained glass window"
    "What image once adorned the window you could only guess; its shattered\
    \ remnants let in a damp draft."

-- Section - The gallery -------------------------------------------------------

gallery :: Place
gallery = place "gallery"
    # withExits [
        west `to` "southern inner ward courtyard",
        north `to` "gallery",
        south `to` "library"
        ]
    # withDescription "The walls were bare, save for a few broken picture\
        \ frames and a lone intact painting weathered beyond recognition. An\
        \ archway lead to the south. To the west was the inner ward courtyard."
    # containing [galleryWalls, brokenPictureFrames, archway]

galleryWalls :: Object
galleryWalls = scenery "gallery walls"
    "you imagined the walls of the gallery once held portraits of the many\
    \ masters of Akkonai."

brokenPictureFrames :: Object
brokenPictureFrames = scenery "broken picture frames"
    "Someone had purposely destroyed the images contained therein."

archway :: Object
archway = scenery "archway"
    "Chiseled into the arch was “hwaptrâ”, the Akettan word for library."

painting :: Object
painting = scenery "painting"
    "Though the image itself had been destroyed by natural forces, the canvas\
    \ seemed somehow untouched by rot."

canvas :: Object
canvas = object "canvas"
    "The canvas had somehow survived the ravages of nature; you suspected \
    \ alchemy. Written on the back of the canvas was “shúrâ kâmârât”. You had \
    \ no inkling as to what that meant."

-- Section - The great hall ----------------------------------------------------

greatHall :: Place
greatHall = place "great hall"
    -- # interior
    # withExits [east `to` "southern inner ward courtyard", west `to` "kitchen"]
    # withDescription "A hall that could once seat hundreds was reduced to a\
        \ pit of detritus. Great tables were crushed beneath collapsing plaster\
        \ and stonework. The dais, waterlogged and rotten, sagged in the\
        \ middle. Surrounding the room were three huge fireplaces, though their\
        \ flues were likely choked with rubble. A small doorway to the west\
        \ lead to a kitchen. To the east was the courtyard of the inner ward."
    # containing [dais, tables, fireplaces, doorway]

dais :: Object
dais = scenery "dais"
    "The dais was rotting."

tables :: Object
tables = scenery "tables"
    "You wondered if this hall had ever been full."

fireplaces :: Object
fireplaces = scenery "fireplaces"
    "None of the fireplaces remained functional."

doorway :: Object
doorway = scenery "doorway"
    "You could not make out what was on the other side."

-- Section - The kitchen -------------------------------------------------------

kitchen :: Place
kitchen = place "kitchen"
    # withExits [east `to` "great hall", north `to` "larder"]
    # withDescription "The larder was to the north. The great hall was to the\
    \ east."
    # containing [knife]

knife :: Object
knife = object "knife"
    "The tapered blade was thoroughly coated with rust; the knife’s handle,\
    \ however, was intact."

-- Section - The larder --------------------------------------------------------

larder :: Place
larder = place "larder"
    # withExit "south" "kitchen"
    # withDescription "The larder was bare save for a pile of torn sacks of\
        \ grain. Rodent droppings were apparent everywhere. The kitchen was to\
        \ the south."
    # containing [rodentDroppings, cobwebs, larderShelves, sacksOfGrain]

rodentDroppings :: Object
rodentDroppings = scenery "rodent droppings"
    "You wrinkled your nose."

cobwebs :: Object
cobwebs = scenery "cobwebs"
    "Cobwebs decorated the ceiling of the larder and cascaded down its bare\
    \ shelves."

larderShelves :: Object
larderShelves = scenery "larder shelves"
    "The shelves were empty of everything but dust cobwebs."

sacksOfGrain :: Object
sacksOfGrain = scenery "sacks of grain"
    "The sacks were empty and scattered about carelessly."

-- Section - The gatehouse -----------------------------------------------------

gatehouse :: Place
gatehouse = place "gatehouse"
    # withExits [
        north `to` "southern inner ward courtyard",
        south `to` "outer ward courtyard"
        ]
    # withDescription "The gatehouse separated the inner ward (to the north)\
        \ from the outer ward (to the south)."

-- Section - The outer ward courtyard ------------------------------------------

outerWardCourtyard :: Place
outerWardCourtyard = place "outer ward courtyard"
    # withExits [north `to` "gatehouse"]
    # withDescription "A yawning chasm sundered the outer ward. The gate to\
        \ the inner ward was to the north."
