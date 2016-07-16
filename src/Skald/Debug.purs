-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.Debug (
    class Debug,
    debug
    ) where

import Prelude

import Data.Array as Array
import Data.Map as Map
import Data.Map (Map)
import Data.String as String
import Data.StrMap as StrMap
import Data.StrMap (StrMap)
import Data.Tuple (Tuple (..))

class Debug a where
    debug :: a -> String

instance debugBoolean :: Debug Boolean where
    debug = show

instance debugInt :: Debug Int where
    debug = show

instance debugNumber :: Debug Number where
    debug = show

instance debugChar :: Debug Char where
    debug = show

instance debugString :: Debug String where
    debug = show

instance debugTuple :: (Debug a, Debug b) => Debug (Tuple a b) where
    debug (Tuple a b) = "Tuple " <> debug a <> " " <> debug b

instance debugArray :: Debug a => Debug (Array a) where
    debug x = "[" <> String.joinWith ", " (map debug x) <> "]"

instance debugFunction :: Debug (a -> b) where
    debug _ = "<?>"

instance debugStrMap :: Debug a => Debug (StrMap a) where
    debug x = debug (Array.fromFoldable (StrMap.toList x))

instance debugMap :: (Debug a, Debug b) => Debug (Map a b) where
    debug x = debug (Array.fromFoldable (Map.toList x))
