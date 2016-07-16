-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

-- | Places are discrete areas of the world containing objects the player can
-- directly interact with.
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

-- TODO: fully implement.
-- | Create a string representation of the given place for debugging purposes.
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
    exits: Exits (StrMap.empty),
    objects: Objects (StrMap.empty),
    visited: false
    }

-- | The name of the given place.
name :: Place -> String
name (Place place') = place'.name

-- | The description of the given place.
description :: Place -> String
description (Place place') = place'.describer (Place place')

-- | The objects contained within the given place.
objects :: Place -> Objects
objects (Place place') = place'.objects

-- | The object contained within the given place with the given name, if it
-- exists.
object :: String -> Place -> Maybe Object
object name' (Place { objects: Objects objects' }) =
    StrMap.lookup name' objects'

-- | The exits leading out of the given place.
exits :: Place -> Exits
exits (Place place') = place'.exits

-- | The list of directions the place may be exited from.
exitDirections :: Place -> List Direction
exitDirections (Place { exits: Exits exits' }) =
    List.fromFoldable (StrMap.keys exits')

-- | Adds an exit to the given place via the given direction.
exitName :: String -> Place -> Maybe String
exitName exit (Place { exits: Exits exits' }) = StrMap.lookup exit exits'

-- | Whether a place has been visited by the player.
visited :: Place -> Boolean
visited (Place place') = place'.visited

-- | Whether a place has not been visited by the player.
unvisited :: Place -> Boolean
unvisited (Place place') = not place'.visited

-- | Set whether a place has been visited by the player.
setVisited :: Boolean -> Place -> Place
setVisited visited' (Place place') = Place (place' { visited = visited' })

-- | Modify the given place's contained objects with the given function.
updateObjects :: (Objects -> Objects) -> Place -> Place
updateObjects f (Place place') = Place (place' { objects = f place'.objects })

-- | Remove an object from the given place.
removeObject :: Object -> Place -> Place
removeObject object' =
    updateObjects
        \(Objects x) -> Objects (StrMap.delete (Object.name object') x)

-- | Add an object to the given place.
addObject :: Object -> Place -> Place
addObject object' =
    updateObjects
        \(Objects x) -> Objects (StrMap.insert (Object.name object') object' x)

-- | The list of names of objects contained in the given place.
objectNames :: Place -> List String
objectNames (Place { objects: Objects objects' }) =
    List.fromFoldable (StrMap.keys objects')

-- | An empty place.
empty :: Place
-- TODO: make this impossible!
empty = place "An error has occurred"
