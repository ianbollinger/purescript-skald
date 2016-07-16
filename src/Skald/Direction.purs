-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

-- | Contains the type for the cardinal directions.
module Skald.Direction (
    Direction (..),
    fromString,
    north,
    northeast,
    east,
    southeast,
    south,
    southwest,
    west,
    northwest,
    up,
    down
    ) where

import Prelude

import Data.Generic (class Generic, gCompare, gEq)
import Data.Maybe (Maybe (..))

import Skald.Debug (class Debug)

-- TODO: opposite function.
data Direction
    = North
    | Northeast
    | East
    | Southeast
    | South
    | Southwest
    | West
    | Northwest
    | Up
    | Down

derive instance genericDirection :: Generic Direction

instance eqDirection :: Eq Direction where
    eq = gEq

instance ordDirection :: Ord Direction where
    compare = gCompare

instance showDirection :: Show Direction where
    show direction = case direction of
        North -> "north"
        Northeast -> "northeast"
        East -> "east"
        Southeast -> "southeast"
        South -> "south"
        Southwest -> "southwest"
        West -> "west"
        Northwest -> "northwest"
        Up -> "up"
        Down -> "down"

instance debugDirection :: Debug Direction where
    debug = show

fromString :: String -> Maybe Direction
fromString string = case string of
    "north" -> Just North
    "northeast" -> Just Northeast
    "east" -> Just East
    "southeast" -> Just Southeast
    "south" -> Just South
    "southwest" -> Just Southwest
    "west" -> Just West
    "northwest" -> Just Northwest
    "up" -> Just Up
    "down" -> Just Down
    _ -> Nothing

-- | The direction north.
north :: Direction
north = North

-- | The direction northeast.
northeast :: Direction
northeast = Northeast

-- | The direction east.
east :: Direction
east = East

-- | The direction southeast.
southeast :: Direction
southeast = Southeast

-- | The direction south.
south :: Direction
south = South

-- | The direction southwest.
southwest :: Direction
southwest = Southwest

-- | The direction west.
west :: Direction
west = West

-- | The direction northwest.
northwest :: Direction
northwest = Northwest

-- | The direction up.
up :: Direction
up = Up

-- | The direction down.
down :: Direction
down = Down
