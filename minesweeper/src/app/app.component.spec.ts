import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize a fresh board for the default difficulty', () => {
    expect(component.boardCells.length).toBe(component.rows * component.cols);
    expect(component.remainingFlags).toBe(component.totalMines);
    expect(component.boardCells.some((cell) => cell.isMine)).toBeFalse();
  });

  it('should place mines after the first reveal and keep the initial cell safe', () => {
    const firstCell = component.board[0][0];

    component.revealCell(firstCell);

    const mineCount = component.boardCells.filter((cell) => cell.isMine).length;
    expect(firstCell.isMine).toBeFalse();
    expect(firstCell.isRevealed).toBeTrue();
    expect(mineCount).toBe(component.totalMines);
  });

  it('should allow flagging and unflagging hidden cells', () => {
    const targetCell = component.board[0][1];

    component.toggleFlag(targetCell);
    expect(targetCell.isFlagged).toBeTrue();
    expect(component.remainingFlags).toBe(component.totalMines - 1);

    component.toggleFlag(targetCell);
    expect(targetCell.isFlagged).toBeFalse();
    expect(component.remainingFlags).toBe(component.totalMines);
  });
});
