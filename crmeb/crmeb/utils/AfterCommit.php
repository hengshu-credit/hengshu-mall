<?php
namespace crmeb\utils;

/** Callbacks belong to the outermost BaseServices transaction, including nested savepoints. */
class AfterCommit
{
    private static $frames = [];

    public static function transaction(callable $runner, callable $work)
    {
        self::$frames[] = [];
        try {
            $result = $runner($work);
        } catch (\Throwable $error) {
            array_pop(self::$frames);
            throw $error;
        }
        $callbacks = array_pop(self::$frames);
        if (self::$frames) {
            $index = count(self::$frames) - 1;
            self::$frames[$index] = array_merge(self::$frames[$index], $callbacks);
        } else {
            // The commit already succeeded: callback failure must never attempt a rollback.
            $failure = null;
            foreach ($callbacks as $callback) {
                try { $callback(); } catch (\Throwable $error) { $failure = $failure ?: $error; }
            }
            if ($failure) throw $failure;
        }
        return $result;
    }

    public static function defer(callable $callback): void
    {
        if (!self::$frames) {
            $callback();
            return;
        }
        self::$frames[count(self::$frames) - 1][] = $callback;
    }
}
