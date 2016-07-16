-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

-- TODO: rename module?
module Skald.Focus (
    FOCUS,
    focus
    ) where

import Prelude

import Control.Monad.Eff (Eff)

foreign import data FOCUS :: !

-- | Sets focus to the input field.
foreign import focus :: forall eff. Eff (focus :: FOCUS | eff) Unit
