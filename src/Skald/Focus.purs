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

-- TODO: we optimally should do this when the page first loads as well.
-- | Sets focus to the input field.
foreign import focus :: forall eff. Eff (focus :: FOCUS | eff) Unit
