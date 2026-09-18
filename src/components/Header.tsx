import { boxWeightInOz, formatInches, formatWeightLbsOz } from '../lib/layout';
import type { Box } from '../types';

type Props = {
  box: Box;
};

export function Header({ box }: Props) {
  const weightOz = boxWeightInOz(box);
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-[1400px] items-stretch gap-6 px-6 py-4">
        <h1 className="font-bold text-xl tracking-wide sm:text-2xl">
          PALLET CONFIGURATION
        </h1>
        <div className="hidden w-px bg-white/20 sm:block" />
        <p className="hidden items-center font-medium text-sm tracking-wide sm:flex sm:text-base">
          BOX SIZE:{' '}
          <span className="ml-2 font-semibold">
            {formatInches(box.length)} × {formatInches(box.width)} ×{' '}
            {formatInches(box.height)}
          </span>
          {weightOz > 0 ? (
            <span className="ml-2 font-normal text-white/70">
              · {formatWeightLbsOz(weightOz)}
            </span>
          ) : null}
        </p>
      </div>
    </header>
  );
}
