import numpy as np, cv2
for f in list(range(96,150))+[60,80]:
    v=cv2.imread(f'../hello/frames/f{f+1:03d}.png').max(2)
    m=v>110
    cols=np.where(m.sum(0)>2)[0]; rows=np.where(m.sum(1)>2)[0]
    ys,xs=np.where(m)
    print(f, cols.min(),cols.max(), cols.max()-cols.min(), rows.min(),rows.max(), round(xs.mean()), round(ys.mean()), int(m.sum()), int(v[m].mean()))
