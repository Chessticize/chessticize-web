"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, SkipForward, XCircle } from "lucide-react"
import { ChessBoard } from "@/components/puzzle-sprint/ChessBoard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  excludeReviewQueueItem,
  submitReviewAttempts,
  type V2ReviewQueuePuzzle,
  type V2ReviewQueueUpdateResult,
} from "@/lib/api/library"

interface ReviewSessionProps {
  puzzles: V2ReviewQueuePuzzle[]
  onQueueChanged?: () => void
}

type AttemptFeedback =
  | { kind: "correct" | "incorrect"; update?: V2ReviewQueueUpdateResult }
  | { kind: "excluded" }

export function ReviewSession({ puzzles, onQueueChanged }: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExcluding, setIsExcluding] = useState(false)

  const currentPuzzle = puzzles[currentIndex] ?? null
  const isComplete = currentIndex >= puzzles.length
  const hasNext = currentIndex + 1 < puzzles.length
  const candidateMoves = useMemo(() => candidateMovePair(currentPuzzle), [currentPuzzle])
  const correctMove = currentPuzzle ? correctMoveForPuzzle(currentPuzzle, candidateMoves) : undefined

  useEffect(() => {
    setCurrentIndex(0)
    setStartedAt(Date.now())
    setFeedback(null)
    setError(null)
  }, [puzzles])

  useEffect(() => {
    setStartedAt(Date.now())
    setFeedback(null)
    setError(null)
  }, [currentPuzzle?.review_item_id])

  const submitRegularAttempt = async (wasCorrect: boolean, userMoves: string[]) => {
    if (!currentPuzzle || currentPuzzle.mode !== "regular" || feedback) return

    await submitAttempt({
      wasCorrect,
      userMoves,
    })
  }

  const submitArrowDuelAttempt = async (chosenMove: string) => {
    if (!currentPuzzle || currentPuzzle.mode !== "arrow_duel" || !candidateMoves || feedback) return

    await submitAttempt({
      wasCorrect: chosenMove === correctMove,
      chosenMove,
      candidateMoves,
    })
  }

  const submitAttempt = async (params: {
    wasCorrect: boolean
    userMoves?: string[]
    chosenMove?: string
    candidateMoves?: [string, string]
  }) => {
    if (!currentPuzzle) return

    try {
      setIsSubmitting(true)
      setError(null)
      const response = await submitReviewAttempts({
        attempts: [{
          review_item_id: currentPuzzle.review_item_id,
          puzzle_source: currentPuzzle.puzzle_source,
          puzzle_id: currentPuzzle.puzzle_id,
          mode: currentPuzzle.mode,
          user_moves: currentPuzzle.mode === "regular" ? params.userMoves : undefined,
          candidate_moves: currentPuzzle.mode === "arrow_duel" ? params.candidateMoves : undefined,
          chosen_move: currentPuzzle.mode === "arrow_duel" ? params.chosenMove : undefined,
          was_correct: params.wasCorrect,
          time_taken_ms: Math.max(0, Date.now() - startedAt),
          attempted_at: new Date().toISOString(),
        }],
      })
      setFeedback({
        kind: params.wasCorrect ? "correct" : "incorrect",
        update: response.updated_items[0],
      })
      onQueueChanged?.()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit review attempt")
    } finally {
      setIsSubmitting(false)
    }
  }

  const excludeCurrent = async () => {
    if (!currentPuzzle || feedback) return

    try {
      setIsExcluding(true)
      setError(null)
      await excludeReviewQueueItem(currentPuzzle.review_item_id, "not_relevant")
      setFeedback({ kind: "excluded" })
      onQueueChanged?.()
    } catch (excludeError) {
      setError(excludeError instanceof Error ? excludeError.message : "Failed to exclude review item")
    } finally {
      setIsExcluding(false)
    }
  }

  const goNext = () => {
    setCurrentIndex(index => index + 1)
  }

  if (puzzles.length === 0 || isComplete) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-700" />
            Review Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-900">This review batch is finished.</p>
          <Button type="button" className="mt-4" onClick={onQueueChanged}>Refresh Queue</Button>
        </CardContent>
      </Card>
    )
  }

  const disabled = isSubmitting || isExcluding || feedback !== null

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Review Session</CardTitle>
          <Badge variant="outline">
            {currentIndex + 1} of {puzzles.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,420px)_1fr]">
          <div className="min-h-[320px]">
            <ChessBoard
              key={currentPuzzle.review_item_id}
              fen={currentPuzzle.fen || ""}
              solutionMoves={currentPuzzle.solution_moves ?? []}
              disabled={disabled}
              mode={currentPuzzle.mode === "arrow_duel" ? "arrowduel" : "puzzle"}
              candidateMoves={candidateMoves}
              bestMove={correctMove}
              blunderMove={candidateMoves?.find(move => move !== correctMove)}
              onPuzzleComplete={submitRegularAttempt}
              onMoveChosen={submitArrowDuelAttempt}
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={currentPuzzle.mode === "arrow_duel" ? "default" : "secondary"}>
                {currentPuzzle.mode === "arrow_duel" ? "Arrow Duel" : "Regular"}
              </Badge>
              <Badge variant="outline">{currentPuzzle.puzzle_source === "user_game" ? "Game" : "Lichess"}</Badge>
              {currentPuzzle.rating ? <Badge variant="outline">{currentPuzzle.rating} rating</Badge> : null}
            </div>

            <p className="break-all font-mono text-sm text-gray-800">{currentPuzzle.fen || currentPuzzle.puzzle_id}</p>

            {currentPuzzle.themes && currentPuzzle.themes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentPuzzle.themes.slice(0, 4).map(theme => (
                  <Badge key={theme} variant="secondary">{theme}</Badge>
                ))}
              </div>
            )}

            {currentPuzzle.mode === "arrow_duel" && candidateMoves && (
              <div className="grid gap-2 sm:grid-cols-2">
                {candidateMoves.map(move => (
                  <Button key={move} type="button" variant="outline" disabled={disabled} onClick={() => submitArrowDuelAttempt(move)}>
                    Choose {move}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={disabled} onClick={excludeCurrent}>
                {isExcluding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SkipForward className="h-4 w-4 mr-2" />}
                Exclude
              </Button>
              {feedback && (
                <Button type="button" onClick={goNext}>
                  {hasNext ? "Next Position" : "Finish Batch"}
                </Button>
              )}
            </div>

            {isSubmitting && (
              <div className="flex items-center gap-2 text-sm text-orange-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting review result...
              </div>
            )}

            {feedback && <FeedbackMessage feedback={feedback} />}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FeedbackMessage({ feedback }: { feedback: AttemptFeedback }) {
  if (feedback.kind === "excluded") {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">
        Position excluded from review.
      </div>
    )
  }

  const isCorrect = feedback.kind === "correct"
  const status = feedback.update?.status
  return (
    <div className={`rounded-lg border p-3 text-sm ${isCorrect ? "border-green-200 bg-green-50 text-green-900" : "border-red-200 bg-red-50 text-red-900"}`}>
      <div className="font-medium">{isCorrect ? "Correct" : "Incorrect"}</div>
      {status && <div className="mt-1">Status: {formatStatus(status)}</div>}
      {feedback.update?.next_due_at && <div className="mt-1">Next due: {formatDate(feedback.update.next_due_at)}</div>}
    </div>
  )
}

function candidateMovePair(puzzle: V2ReviewQueuePuzzle | null): [string, string] | undefined {
  if (!puzzle?.candidate_moves || puzzle.candidate_moves.length < 2) return undefined

  const blunder = puzzle.candidate_moves.find(candidate => candidate.kind === "blunder")?.move
  const best = puzzle.candidate_moves.find(candidate => candidate.kind === "best")?.move ?? puzzle.correct_move
  if (blunder && best && blunder !== best) {
    return [blunder, best]
  }

  const moves = puzzle.candidate_moves.map(candidate => candidate.move).filter(Boolean)
  return moves.length >= 2 ? [moves[0], moves[1]] : undefined
}

function correctMoveForPuzzle(puzzle: V2ReviewQueuePuzzle, candidateMoves?: [string, string]): string | undefined {
  return puzzle.correct_move
    ?? puzzle.candidate_moves?.find(candidate => candidate.kind === "best")?.move
    ?? candidateMoves?.[1]
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value))
}
