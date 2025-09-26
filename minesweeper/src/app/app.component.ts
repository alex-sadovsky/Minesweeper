import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type GameStatus = 'playing' | 'won' | 'lost';

interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  isExploded: boolean;
  adjacentMines: number;
}

interface Difficulty {
  label: string;
  rows: number;
  cols: number;
  mines: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly difficulties: Difficulty[] = [
    { label: 'Beginner', rows: 9, cols: 9, mines: 10 },
    { label: 'Intermediate', rows: 16, cols: 16, mines: 40 },
    { label: 'Expert', rows: 16, cols: 30, mines: 99 },
  ];

  selectedDifficulty: Difficulty = this.difficulties[0];
  rows = this.selectedDifficulty.rows;
  cols = this.selectedDifficulty.cols;
  totalMines = this.selectedDifficulty.mines;

  board: Cell[][] = [];
  remainingFlags = this.totalMines;
  gameStatus: GameStatus = 'playing';
  revealedSafeCells = 0;
  private minesPlaced = false;

  constructor() {
    this.resetBoard();
  }

  get boardCells(): Cell[] {
    return this.board.flat();
  }

  get gridTemplateColumns(): string {
    return `repeat(${this.cols}, 1fr)`;
  }

  get statusMessage(): string {
    switch (this.gameStatus) {
      case 'won':
        return 'You cleared the minefield!';
      case 'lost':
        return 'Boom! You hit a mine.';
      default:
        return 'Find all the safe tiles without detonating a mine.';
    }
  }

  get safeCells(): number {
    return this.rows * this.cols - this.totalMines;
  }

  onDifficultyChange(label: string): void {
    const difficulty = this.difficulties.find((option) => option.label === label);
    if (!difficulty) {
      return;
    }

    this.selectedDifficulty = difficulty;
    this.rows = difficulty.rows;
    this.cols = difficulty.cols;
    this.totalMines = difficulty.mines;
    this.resetBoard();
  }

  handleDifficultyChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (!select) {
      return;
    }

    this.onDifficultyChange(select.value);
  }

  resetGame(): void {
    this.resetBoard();
  }

  revealCell(cell: Cell): void {
    if (this.gameStatus !== 'playing' || cell.isFlagged || cell.isRevealed) {
      return;
    }

    this.ensureMinesPlaced(cell.row, cell.col);

    if (cell.isMine) {
      this.triggerMine(cell);
      return;
    }

    this.floodReveal(cell);

    if (this.revealedSafeCells === this.safeCells) {
      this.gameStatus = 'won';
      this.revealAllMines();
    }
  }

  onCellRightClick(event: MouseEvent, cell: Cell): void {
    event.preventDefault();
    this.toggleFlag(cell);
  }

  toggleFlag(cell: Cell): void {
    if (this.gameStatus !== 'playing' || cell.isRevealed) {
      return;
    }

    if (cell.isFlagged) {
      cell.isFlagged = false;
      this.remainingFlags++;
    } else if (this.remainingFlags > 0) {
      cell.isFlagged = true;
      this.remainingFlags--;
    }
  }

  getCellClasses(cell: Cell): Record<string, boolean> {
    return {
      revealed: cell.isRevealed,
      flagged: cell.isFlagged,
      mine: cell.isMine && cell.isRevealed,
      exploded: cell.isExploded,
      [`value-${cell.adjacentMines}`]:
        cell.isRevealed && !cell.isMine && cell.adjacentMines > 0,
    };
  }

  cellAriaLabel(cell: Cell): string {
    if (cell.isFlagged) {
      return 'Flagged cell';
    }

    if (!cell.isRevealed) {
      return 'Hidden cell';
    }

    if (cell.isMine) {
      return 'Mine';
    }

    if (cell.adjacentMines === 0) {
      return 'Empty cell';
    }

    return `${cell.adjacentMines} adjacent mines`;
  }

  trackByCell(_index: number, cell: Cell): string {
    return `${cell.row}-${cell.col}`;
  }

  private resetBoard(): void {
    this.board = Array.from({ length: this.rows }, (_, row) =>
      Array.from({ length: this.cols }, (_, col): Cell => ({
        row,
        col,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        isExploded: false,
        adjacentMines: 0,
      })),
    );
    this.remainingFlags = this.totalMines;
    this.gameStatus = 'playing';
    this.revealedSafeCells = 0;
    this.minesPlaced = false;
  }

  private ensureMinesPlaced(excludeRow: number, excludeCol: number): void {
    if (this.minesPlaced) {
      return;
    }

    this.placeMines(excludeRow, excludeCol);
    this.calculateAdjacentMineCounts();
    this.minesPlaced = true;
  }

  private placeMines(excludeRow: number, excludeCol: number): void {
    const availablePositions: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (row === excludeRow && col === excludeCol) {
          continue;
        }
        availablePositions.push({ row, col });
      }
    }

    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [
        availablePositions[j],
        availablePositions[i],
      ];
    }

    const minesToPlace = Math.min(this.totalMines, availablePositions.length);
    for (let i = 0; i < minesToPlace; i++) {
      const { row, col } = availablePositions[i];
      this.board[row][col].isMine = true;
    }
  }

  private calculateAdjacentMineCounts(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.board[row][col];
        cell.adjacentMines = this.getNeighbors(row, col).filter((neighbor) => neighbor.isMine).length;
      }
    }
  }

  private floodReveal(startCell: Cell): void {
    const stack: Cell[] = [startCell];

    while (stack.length > 0) {
      const cell = stack.pop();
      if (!cell || cell.isRevealed || cell.isMine) {
        continue;
      }

      cell.isRevealed = true;
      this.revealedSafeCells++;

      if (cell.adjacentMines === 0) {
        const hiddenNeighbors = this.getNeighbors(cell.row, cell.col).filter(
          (neighbor) => !neighbor.isRevealed && !neighbor.isFlagged,
        );
        stack.push(...hiddenNeighbors);
      }
    }
  }

  private getNeighbors(row: number, col: number): Cell[] {
    const neighbors: Cell[] = [];

    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r === row && c === col) {
          continue;
        }

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          neighbors.push(this.board[r][c]);
        }
      }
    }

    return neighbors;
  }

  private triggerMine(cell: Cell): void {
    this.gameStatus = 'lost';
    cell.isExploded = true;
    cell.isRevealed = true;
    this.revealAllMines();
  }

  private revealAllMines(): void {
    for (const row of this.board) {
      for (const cell of row) {
        if (cell.isMine) {
          cell.isRevealed = true;
        }
      }
    }
  }
}
