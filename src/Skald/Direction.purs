-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

-- | Contains the type for the cardinal directions.
module Skald.Direction (
    Direction,
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

-- TODO: make into an ADT.
-- TODO: opposite function.
type Direction = String

-- | The direction north.
north :: Direction
north = "north"

-- | The direction northeast.
northeast :: Direction
northeast = "northeast"

-- | The direction east.
east :: Direction
east = "east"

-- | The direction southeast.
southeast :: Direction
southeast = "southeast"

-- | The direction south.
south :: Direction
south = "south"

-- | The direction southwest.
southwest :: Direction
southwest = "southwest"

-- | The direction west.
west :: Direction
west = "west"

-- | The direction northwest.
northwest :: Direction
northwest = "northwest"

-- | The direction up.
up :: Direction
up = "up"

-- | The direction down.
down :: Direction
down = "down"
