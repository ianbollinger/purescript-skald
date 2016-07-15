-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.Tale (
    Tale(..),
    tale,
    title,
    author,
    initialWorld,
    preamble,
    by,
    withPreamble,
    thatBeginsIn,
    withPlace,
    withPlaces,
    withCommand
    ) where

import Prelude

import Data.Foldable (foldl)
import Data.StrMap as StrMap

import Skald.Action as Action
import Skald.Command as Command
import Skald.Command (command)
import Skald.Place as Place
import Skald.Place (Place)
import Skald.World as World
import Skald.World (World)

data Tale = Tale {
    title :: String,
    author :: String,
    initialWorld :: World,
    preamble :: Tale -> String
    }

-- | Creates an empty tale with the given title.
tale :: String -> Tale
tale title' = Tale {
    title: title',
    author: "",
    initialWorld: Action.emptyWorld,
    preamble: defaultPreamble
    }

-- | The title of the given tale.
title :: Tale -> String
title (Tale tale') = tale'.title

-- | The author name of the given tale.
author :: Tale -> String
author (Tale tale') = tale'.author

initialWorld :: Tale -> World
initialWorld (Tale tale') = tale'.initialWorld

-- | The function to be called when the tale begins.
--
-- The default behavior is to display the tale title and author by-line.
preamble :: Tale -> (Tale -> String)
preamble (Tale tale') = tale'.preamble

-- | The default HTML displayed before the tale's history.
defaultPreamble :: Tale -> String
defaultPreamble tale' = title tale' <> "\nby " <> author tale'

-- | Sets the author's name for the given tale.
--
-- The author's name is displayed by default in the tale's by-line.
by :: String -> Tale -> Tale
by name (Tale tale') = Tale (tale' { author = name })

-- | Sets the function to be called when the tale begins.
--
-- The default behavior is to display the tale title and author by-line.
withPreamble :: (Tale -> String) -> Tale -> Tale
withPreamble preamble' (Tale tale') = Tale (tale' { preamble = preamble' })

-- | Sets the place where the tale begins.
thatBeginsIn :: Place -> Tale -> Tale
thatBeginsIn place (Tale tale') =
    withPlace place
    $ Tale (tale' { initialWorld = World.setCurrentPlace place tale'.initialWorld })

-- | Adds the given place to the tale.
withPlace :: Place -> Tale -> Tale
withPlace place (Tale tale') =
    Tale (tale' { initialWorld = newWorld })
    where
        update = StrMap.insert (Place.name place) place
        newWorld = World.updatePlaces update tale'.initialWorld

-- | Adds the given places to the tale.
withPlaces :: Array Place -> Tale -> Tale
withPlaces places (Tale tale') =
    Tale (tale' { initialWorld = newWorld })
    where
        update world =
            foldl (\places' place -> StrMap.insert (Place.name place) place places') world places
        newWorld = World.updatePlaces update tale'.initialWorld

-- | `withCommand pattern handler tale`
withCommand :: String -> Command.Handler -> Tale -> Tale
withCommand pattern handler (Tale tale') =
    Tale (tale' { initialWorld = newWorld })
    where
        update = Command.insert (command pattern) handler
        newWorld = World.updateCommands update tale'.initialWorld
