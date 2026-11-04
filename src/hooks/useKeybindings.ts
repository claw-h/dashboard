import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { ScheduleAction } from '../state/scheduleEngine';
import type { ScheduleState } from '../types/schedule';

export function useKeybindings(
  state: ScheduleState,
  dispatch: Dispatch<ScheduleAction>
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        e.preventDefault();
        if (target && typeof target.blur === 'function') {
          target.blur();
        }
        dispatch({ type: 'SET_INPUT_MODE', mode: 'NORMAL', keyHint: 'Esc' });
        return;
      }

      if (isTextInput || state.inputMode !== 'NORMAL') {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          e.preventDefault();
          dispatch({ type: 'MOVE_CURSOR', delta: 1 });
          break;
        }

        case 'k':
        case 'ArrowUp': {
          e.preventDefault();
          dispatch({ type: 'MOVE_CURSOR', delta: -1 });
          break;
        }

        case 'h': {
          e.preventDefault();
          dispatch({ type: 'FOCUS_LEFT_OR_TOGGLE' });
          break;
        }

        case 'l': {
          e.preventDefault();
          dispatch({ type: 'FOCUS_RIGHT_EXPAND' });
          break;
        }

        case 'J': {
          e.preventDefault();
          dispatch({ type: 'REORDER_TASK_PRIORITY', direction: 'DOWN' });
          break;
        }

        case 'K': {
          e.preventDefault();
          dispatch({ type: 'REORDER_TASK_PRIORITY', direction: 'UP' });
          break;
        }

        case 'p': {
          e.preventDefault();
          dispatch({ type: 'TOGGLE_PROJECT_BROWSER' });
          break;
        }

        case 'g': {
          e.preventDefault();
          dispatch({ type: 'TOGGLE_AGENT_PROTOCOL' });
          break;
        }

        case 's': {
          e.preventDefault();
          dispatch({ type: 'TOGGLE_CLOUD_SYNC' });
          break;
        }

        case 'a': {
          e.preventDefault();
          dispatch({
            type: 'FOCUS_PANEL3_COMPOSER',
            mode: state.selectedTaskId ? 'SUBTASK' : 'ROOT',
            targetParentId: state.selectedTaskId,
          });
          break;
        }

        case 'd': {
          e.preventDefault();
          dispatch({ type: 'DELETE_TASK_BY_ID' });
          break;
        }

        case 'e': {
          e.preventDefault();
          dispatch({ type: 'SET_PANEL_FOCUS', panel: 'RIGHT' });
          dispatch({ type: 'SET_INPUT_MODE', mode: 'INLINE_EDIT', keyHint: 'e' });
          break;
        }

        case 't': {
          e.preventDefault();
          dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'SCHEDULE', keyHint: 't' });
          break;
        }

        case 'c': {
          e.preventDefault();
          dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'CLI_STREAM', keyHint: 'c' });
          break;
        }

        case 'i': {
          e.preventDefault();
          dispatch({ type: 'SET_INPUT_MODE', mode: 'FILTER_BAR', keyHint: 'i' });
          break;
        }

        case '/': {
          e.preventDefault();
          dispatch({ type: 'SET_INPUT_MODE', mode: 'SEARCH_REGEX', keyHint: '/' });
          break;
        }

        case 'm': {
          e.preventDefault();
          dispatch({ type: 'TOGGLE_MILESTONE' });
          break;
        }

        case 'Tab': {
          e.preventDefault();
          dispatch({ type: 'CYCLE_PANEL_FOCUS' });
          break;
        }

        case ' ': {
          e.preventDefault();
          dispatch({ type: 'CYCLE_TASK_STATUS' });
          break;
        }

        case 'Enter': {
          e.preventDefault();
          dispatch({ type: 'TOGGLE_TASK_EXPAND' });
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.inputMode, state.activeMode, state.selectedTaskId, dispatch]);
}
