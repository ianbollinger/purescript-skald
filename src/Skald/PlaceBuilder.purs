-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.PlaceBuilder (
    withDescription,
    whenDescribing,
    withExit,
    withExits,
    to,
    containing
    ) where

import Prelude

import Data.Foldable (foldr)
import Data.StrMap as StrMap
import Data.Tuple (Tuple (..))

import Skald.Direction (Direction)
import Skald.Object as Object
import Skald.Object (Object)
import Skald.Place as Place
import Skald.Place (Place (..))

{-

data PlaceBuilder = PlaceBuilder {
    name :: String,
    describer :: Place -> String,
    exits :: Exits,
    objects :: Objects,
    visited :: Boolean
    }

-}



withDescription :: String -> Place -> Place
withDescription description' (Place place') =
    Place (place' { describer = const description' })

whenDescribing :: (Place -> String) -> Place -> Place
whenDescribing describer' (Place place') =
    Place (place' { describer = describer' })

-- | `withExit direction exitName place`
withExit :: Direction -> String -> Place -> Place
withExit direction exitName' (Place place'@{ exits: Place.Exits exits' }) =
    Place (place' { exits = Place.Exits (StrMap.insert direction exitName' exits') })

withExits :: Array (Tuple Direction String) -> Place -> Place
withExits exits'' (Place place'@{ exits: Place.Exits exits' }) =
    Place (place' { exits = Place.Exits (update exits') })
    where
        update x =
            foldr (\(Tuple direction exitName') ->
                StrMap.insert direction exitName') x exits''

to :: forall a b. a -> b -> Tuple a b
to = Tuple

-- | Adds the given objects to the given place.
containing :: Array Object -> Place -> Place
containing objects'' (Place place'@{ objects: Place.Objects objects' }) =
    Place (place' { objects = Place.Objects (update objects') })
    where
        update x =
            -- TODO: reuse addObject.
            foldr (\object' -> StrMap.insert (Object.name object') object') x
                objects''
