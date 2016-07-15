-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.Place (
    -- TODO: don't export innards.
    module Skald.Internal,
    toString,
    place,
    name,
    description,
    exits,
    exitName,
    exitDirections,
    visited,
    unvisited,
    setVisited,
    objects,
    object,
    updateObjects,
    removeObject,
    addObject,
    objectNames,
    empty
    ) where

import Prelude

import Data.List as List
import Data.List (List)
import Data.Maybe (Maybe)
import Data.StrMap as StrMap

import Skald.Direction (Direction)
import Skald.Object as Object
import Skald.Object (Object)
import Skald.Internal (Place (..), Exits (..), Objects (..))

noExits :: Exits
noExits = Exits (StrMap.empty)

noObjects :: Objects
noObjects = Objects (StrMap.empty)

-- TODO: fully implement.
toString :: Place -> String
toString place' =
    "Place\n\
    \            { name = \"" <> name place' <> "\"\n\
    \            , description = \"" <> description place' <> "\"\n\
    \            , exits = " <> show (exits place') <> "\n\
    \            , objects = " <> "<???>" <> "\n\
    \            }"

-- | Creates a new place with the given name.
place :: String -> Place
place name' = Place {
    name: name',
    describer: const "",
    exits: noExits,
    objects: noObjects,
    visited: false
    }

-- | The name of the given place.
name :: Place -> String
name (Place place') = place'.name

-- | The description of the given place.
description :: Place -> String
description (Place place') = place'.describer (Place place')

objects :: Place -> Objects
objects (Place place') = place'.objects

object :: String -> Place -> Maybe Object
object name' (Place place') = case place'.objects of
    Objects objects' -> StrMap.lookup name' objects'

exits :: Place -> Exits
exits (Place place') = place'.exits

exitDirections :: Place -> List Direction
exitDirections (Place { exits: Exits exits' }) =
    List.fromFoldable (StrMap.keys exits')

-- | `exitName direction place`
exitName :: String -> Place -> Maybe String
exitName exit (Place { exits: Exits exits' }) = StrMap.lookup exit exits'

visited :: Place -> Boolean
visited (Place place') = place'.visited

unvisited :: Place -> Boolean
unvisited (Place place') = not place'.visited

setVisited :: Boolean -> Place -> Place
setVisited visited' (Place place') = Place (place' { visited = visited' })

updateObjects :: (Objects -> Objects) -> Place -> Place
updateObjects f (Place place') = Place (place' { objects = f place'.objects })

removeObject :: Object -> Place -> Place
removeObject object' =
    updateObjects
        (\(Objects x) -> Objects (StrMap.delete (Object.name object') x))

addObject :: Object -> Place -> Place
addObject object' =
    updateObjects
        (\(Objects x) -> Objects (StrMap.insert (Object.name object') object' x))

objectNames :: Place -> List String
objectNames (Place { objects: Objects objects' }) =
    List.fromFoldable (StrMap.keys objects')

-- | An empty place.
empty :: Place
-- TODO: make this impossible!
empty = place "An error has occurred"
