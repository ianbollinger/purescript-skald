-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.World
  ( module InternalExports

  -- * Construction
  , empty

  -- * Places
  , places
  , setPlaces
  , updatePlaces
  , place

  -- * Current place
  , currentPlace
  , setCurrentPlace
  , updateCurrentPlace

  -- * Objects
  , removeObject
  , addObject

  -- * Commands
  , commands
  , setCommands
  , updateCommands

  -- * Inventory
  , inventory
  , item
  , updateInventory
  -- TODO: re-export from Skald.
  , inventoryIsEmpty
  , addToInventory
  , removeFromInventory
  , inventoryNames
  ) where

import Prelude
import Data.List as List
import Data.List (List(..))
import Data.Maybe (Maybe(..))
import Data.StrMap (StrMap)
import Data.StrMap as StrMap
import Skald.Internal (Inventory, Places, World) as InternalExports
import Skald.Internal (CommandMap, Inventory(..), World(..))
import Skald.Object as Object
import Skald.Object (Object)
import Skald.Place as Place
import Skald.Place (Place)

-- | An empty world.
empty :: World
empty = World
  { currentPlaceName: ""
  , places: StrMap.empty
  , commands: Nil
  , inventory: Inventory StrMap.empty
  }

-- | The places contained in the given world.
places :: World -> StrMap Place
places (World world) = world.places

-- | Sets the places contained in the given world.
setPlaces :: StrMap Place -> World -> World
setPlaces places' (World world) = World (world { places = places' })

-- | Applies a function over the places contained in the given world.
updatePlaces :: (StrMap Place -> StrMap Place) -> World -> World
updatePlaces f (World world) = World (world { places = f world.places })

place :: String -> World -> Place
place name world = case StrMap.lookup name (places world) of
  Just place' -> place'
  Nothing -> Place.empty

currentPlace :: World -> Place
currentPlace (World world) = place world.currentPlaceName (World world)

-- | Sets the current place in the given world.
setCurrentPlace :: Place -> World -> World
setCurrentPlace place' (World world) =
  World (world { places = places', currentPlaceName = Place.name place' })
  where
    -- TODO: is this really necessary?
    places' =
      StrMap.insert (Place.name place') place' (places (World world))

updateCurrentPlace :: (Place -> Place) -> World -> World
updateCurrentPlace f world = setCurrentPlace (f (currentPlace world)) world

-- | Removes the object from the current place.
removeObject :: Object -> World -> World
removeObject = updateCurrentPlace <<< Place.removeObject

-- | Adds an object to the current place.
addObject :: Object -> World -> World
addObject = updateCurrentPlace <<< Place.addObject

commands :: World -> CommandMap
commands (World world) = world.commands

setCommands :: CommandMap -> World -> World
setCommands newCommands (World world) = World (world { commands = newCommands })

updateCommands :: (CommandMap -> CommandMap) -> World -> World
updateCommands f (World world) = World (world { commands = f world.commands })

-- | The player inventory for the given world.
inventory :: World -> Inventory
inventory (World world) = world.inventory

-- | The object contained within the given world's player inventory with the
-- given name, if it exists.
item :: String -> World -> Maybe Object
item name (World { inventory: Inventory inventory' }) =
  StrMap.lookup name inventory'

-- | Applies a function over the given world's player inventory.
updateInventory :: (Inventory -> Inventory) -> World -> World
updateInventory f (World world) =
  World (world { inventory = f world.inventory })

-- | Whether the given world's player inventory is empty.
inventoryIsEmpty :: World -> Boolean
inventoryIsEmpty (World { inventory: Inventory inventory' }) =
  StrMap.isEmpty inventory'

-- | Adds an object to the given world's player inventory.
addToInventory :: Object -> World -> World
addToInventory object (World world@{ inventory: Inventory inventory' }) =
  World (world { inventory = Inventory update })
  where
    update = StrMap.insert (Object.name object) object inventory'

-- | Removes an object from the given world's player inventory.
removeFromInventory :: Object -> World -> World
removeFromInventory object (World world@{ inventory: Inventory inventory' }) =
  World (world { inventory = Inventory update })
  where
    update = StrMap.delete (Object.name object) inventory'

-- | The list of names of objects contained in the given world's player
-- inventory.
inventoryNames :: World -> List String
inventoryNames (World { inventory: Inventory inventory' }) =
  List.fromFoldable (StrMap.keys inventory')
