import numpy as np, cv2, sys
D=sys.argv[1]
def L(i): return cv2.imread(f'{D}/frames/f{i+1:03d}.png').astype(np.float32)
ref=L(80).max(2)
mask=ref>90
first=np.full(ref.shape,-1.0)
for i in range(0,60):
    v=L(i).max(2)
    hit=(v>0.6*ref)&mask&(first<0)
    first[hit]=i
np.save('first.npy',first); np.save('mask.npy',mask)
vis=np.zeros((*ref.shape,3),np.uint8)
f=first.copy(); f[f<0]=np.nan
norm=(f-np.nanmin(f))/(np.nanmax(f)-np.nanmin(f))
col=cv2.applyColorMap((np.nan_to_num(norm)*255).astype(np.uint8),cv2.COLORMAP_TURBO)
vis[mask]=col[mask]
cv2.imwrite('appear.png',vis[150:500,150:1100])
print(np.nanmin(f),np.nanmax(f))
