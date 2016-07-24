-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

-- | Contains functions for manipulating and formatting history.
--
-- "History" is the name for in-tale messages, error messages, and echoed
-- player input generated during the telling of a tale.
module Skald.History
  ( module InternalExports
  , cons
  , fromList
  , toList
  , singleton
  , message
  , echo
  , heading
  , error
  , debug
  ) where

import Data.List (List(..), (:))
import Skald.Internal (History, HistoricalEntry) as InternalExports
import Skald.Internal (History(..), HistoricalEntry(..))

-- | Add a historical entry to the beginning of the given history.
cons :: HistoricalEntry -> History -> History
cons entry (History history) = History (entry : history)

-- | Create a new history from a historical entry list.
fromList :: List HistoricalEntry -> History
fromList = History

-- | Create a historical entry list from the given history.
toList :: History -> List HistoricalEntry
toList (History history) = history

-- | Create a new history with a single historical entry.
singleton :: HistoricalEntry -> History
singleton entry = History (entry : Nil)

-- | Create a new message historical entry.
--
-- This is used by the say function.
message :: String -> HistoricalEntry
message = Message

-- | Create a new echo historical entry.
--
-- This is used when displaying echoed player input.
echo :: String -> HistoricalEntry
echo = Echo

-- | Create a new heading historical entry.
--
-- This is primarily used when displaying place titles.
heading :: String -> HistoricalEntry
heading = Heading

-- | Create a new error historical entry.
--
-- This is used when displaying error messages.
error :: String -> HistoricalEntry
error = Error

-- | Create a new debugging historical entry.
--
-- This is used when displaying debug messages.
debug :: String -> HistoricalEntry
debug = Debug
